from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import yt_dlp
import humanize
import requests
import os

app = Flask(__name__)
CORS(app)

PREFERRED_VIDEO_EXTS = ["webm"]
PREFERRED_AUDIO_EXTS = ["webm", "m4a", "mp3"]
TARGET_RESOLUTIONS = ["2160p", "1440p", "1080p", "720p", "480p"]
TARGET_ABRS = [320, 160, 128]

def format_size(val):
    try:
        return humanize.naturalsize(val, binary=False)
    except Exception:
        return "Unknown"

@app.route('/api/youtube', methods=['POST'])
def api_youtube():
    data = request.get_json(silent=True) or {}
    url = data.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'noplaylist': True,
        'prefer_ffmpeg': True,
        'extract_flat': False,
        'retries': 5,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        formats = info.get('formats', []) or []
        duration = int(info.get('duration') or 0)

        # Progressive (video+audio)
        progressive = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
        prog_best = None
        if progressive:
            prog_best = max(progressive, key=lambda x: (x.get('height') or 0, x.get('tbr') or 0))
        # Best 360p progressive entry (common baseline)
        prog_360 = None
        prog_360_list = [f for f in progressive if (f.get('height') or 0) == 360]
        if prog_360_list:
            mp4_360 = [f for f in prog_360_list if (f.get('ext') or '').lower() == 'mp4']
            sel_360 = max(mp4_360 or prog_360_list, key=lambda x: (x.get('tbr') or 0))
            size_360 = sel_360.get('filesize') or sel_360.get('filesize_approx')
            prog_360 = {
                'type': 'Video+Audio',
                'format_id': sel_360.get('format_id', ''),
                'ext': sel_360.get('ext', ''),
                'resolution': '360p',
                'height': 360,
                'fps': sel_360.get('fps', 'N/A'),
                'size': format_size(size_360) if size_360 else 'Unknown',
                'url': sel_360.get('url', '')
            }

        video_only = [f for f in formats if f.get('vcodec') != 'none' and (f.get('acodec') == 'none' or f.get('audio_ext') == 'none')]
        video_streams = []
        seen = set()
        for res in TARGET_RESOLUTIONS:
            cands = [f for f in video_only if (f.get('format_note') or '').lower() == res.lower()]
            if not cands:
                try:
                    h = int(res.replace('p', ''))
                    cands = [f for f in video_only if (f.get('height') or 0) == h]
                except Exception:
                    cands = []
            if not cands:
                continue
            mp4pref = [f for f in cands if (f.get('ext') or '').lower() in PREFERRED_VIDEO_EXTS]
            best = max(mp4pref or cands, key=lambda x: (x.get('tbr') or 0, x.get('filesize', x.get('filesize_approx', 0)) or 0))
            if res.lower() in seen:
                continue
            seen.add(res.lower())
            size_val = best.get('filesize') or best.get('filesize_approx')
            video_streams.append({
                'type': 'Video',
                'format_id': best.get('format_id', ''),
                'ext': best.get('ext', ''),
                'resolution': best.get('format_note', res),
                'height': best.get('height', None),
                'fps': best.get('fps', 'N/A'),
                'size': format_size(size_val) if size_val else 'Unknown',
                'url': best.get('url', '')
            })

        audio_only = [f for f in formats if f.get('vcodec') == 'none' and f.get('acodec') != 'none']
        audio_streams = []
        picked_ids = set()
        def pick_nearest(target):
            # prefer >= target, then closest
            with_abr = [f for f in audio_only if f.get('abr')]
            if not with_abr:
                return None
            # split candidates
            ge = [f for f in with_abr if (f.get('abr') or 0) >= target]
            le = [f for f in with_abr if (f.get('abr') or 0) < target]
            def sort_key(x):
                size = x.get('filesize') or x.get('filesize_approx') or 0
                return ((x.get('abr') or 0), size)
            best = None
            if ge:
                # highest abr above target
                ge_sorted = sorted(ge, key=sort_key, reverse=True)
                best = ge_sorted[0]
            elif le:
                # closest below target
                le_sorted = sorted(le, key=sort_key, reverse=True)
                best = le_sorted[0]
            return best
        for target in TARGET_ABRS:
            best = pick_nearest(target)
            if not best:
                continue
            if best.get('format_id') in picked_ids:
                # try next candidate by excluding this id
                audio_only_alt = [f for f in audio_only if f.get('format_id') != best.get('format_id')]
                audio_only = audio_only_alt
                best = pick_nearest(target)
                if not best:
                    continue
            picked_ids.add(best.get('format_id'))
            abr_val = int(round(best.get('abr', target) or target))
            size_val = best.get('filesize') or best.get('filesize_approx')
            audio_streams.append({
                'type': 'Audio',
                'format_id': best.get('format_id', ''),
                'ext': best.get('ext', ''),
                'abr': f"{abr_val}kbps",
                'size': format_size(size_val) if size_val else 'Unknown',
                'url': best.get('url', '')
            })
        # ensure at most 3 entries
        audio_streams = audio_streams[:3]

        resp = {
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'duration': f"{duration // 60}m {duration % 60}s",
            'streams': {
                'video_audio': None if not prog_best else {
                    'type': 'Video+Audio',
                    'format_id': prog_best.get('format_id', ''),
                    'ext': prog_best.get('ext', ''),
                    'resolution': prog_best.get('format_note', 'Unknown'),
                    'height': prog_best.get('height', None),
                    'fps': prog_best.get('fps', 'N/A'),
                    'size': format_size(prog_best.get('filesize') or prog_best.get('filesize_approx')) if (prog_best.get('filesize') or prog_best.get('filesize_approx')) else 'Unknown',
                    'url': prog_best.get('url', '')
                },
                'video': video_streams,
                'audio': audio_streams,
                'progressive_360': prog_360
            }
        }
        return jsonify(resp)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download_id_get', methods=['GET'])
def download_id_get():
    url = request.args.get('url')
    format_id = request.args.get('format_id')
    filename = request.args.get('filename', 'download')
    ext = request.args.get('ext', 'mp4')
    
    # Validate required parameters
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    if not format_id:
        return jsonify({'error': 'Format ID is required'}), 400
        
    # Sanitize filename
    filename = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
    ydl_opts = {'quiet': True, 'noplaylist': True, 'format': str(format_id)}
    try:
        def generate():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                selected = None
                for f in (info.get('formats') or []):
                    if str(f.get('format_id')) == str(format_id):
                        selected = f
                        break
                if not selected or not selected.get('url'):
                    raise Exception('Format URL not found')
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                    'Accept': '*/*',
                    'Connection': 'keep-alive'
                }
                with requests.get(selected['url'], headers=headers, stream=True) as r:
                    r.raise_for_status()
                    for chunk in r.iter_content(chunk_size=1024*256):
                        if chunk:
                            yield chunk
        headers = {'Content-Disposition': f'attachment; filename="{filename}.{ext}"'}
        return Response(generate(), headers=headers, mimetype='application/octet-stream')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download_best_get', methods=['GET'])
def download_best_get():
    url = request.args.get('url')
    filename = request.args.get('filename', 'video')
    
    # Validate required parameter
    if not url:
        return jsonify({'error': 'URL is required'}), 400
        
    # Sanitize filename
    filename = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()

    # Get best progressive format (includes both video and audio)
    try:
        ydl_opts = {'quiet': True, 'noplaylist': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        formats = info.get('formats') or []
        progressive = [f for f in formats if f.get('vcodec') != 'none' and f.get('acodec') != 'none']
        
        # First try MP4, then any other format
        mp4_formats = [f for f in progressive if (f.get('ext') or '').lower() == 'mp4']
        selected = None
        
        if mp4_formats:
            selected = max(mp4_formats, key=lambda x: (x.get('height') or 0, x.get('tbr') or 0))
        elif progressive:
            selected = max(progressive, key=lambda x: (x.get('height') or 0, x.get('tbr') or 0))
            
        if not selected or not selected.get('url'):
            return jsonify({'error': 'No suitable format found'}), 404

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': '*/*',
            'Connection': 'keep-alive'
        }

        def generate():
            with requests.get(selected['url'], headers=headers, stream=True) as r:
                r.raise_for_status()
                for chunk in r.iter_content(chunk_size=1024*256):
                    if chunk:
                        yield chunk

        ext = selected.get('ext', 'mp4')
        return Response(
            generate(), 
            headers={'Content-Disposition': f'attachment; filename="{filename}.{ext}"'}, 
            mimetype=f'video/{ext}'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
