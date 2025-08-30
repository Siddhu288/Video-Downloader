import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { FaSpinner, FaDownload, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [progressiveFiles, setProgressiveFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("youtube");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDuration, setVideoDuration] = useState("0:00");
  // Removed preparing popup per request

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const handleFetch = async () => {
    if (!videoUrl) {
      showNotification("Please enter a valid URL", "danger");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setVideoTitle(data.title || "");
      setThumbnail(data.thumbnail || null);
      // Duration comes as a formatted string like "Xm Ys"
      setVideoDuration(data.duration || "0:00");

      const streams = data.streams || {};
      const audio = Array.isArray(streams.audio) ? streams.audio : [];
      const video = Array.isArray(streams.video) ? streams.video : [];
      const progressive360 = streams.progressive_360 ? [streams.progressive_360] : [];

      const safeTitle = (data.title || '').replace(/[^a-z0-9\-_. ]/gi, '_') || 'download';

      const processedAudioFiles = audio.map((f) => ({
        type: (f.ext || '').toUpperCase() || 'AUDIO',
        quality: f.abr || 'Unknown',
        size: f.size || 'Unknown',
        formatId: f.format_id,
        ext: f.ext || 'mp3',
        filenameBase: safeTitle,
        directUrl: f.url || '#'
      }));
      setAudioFiles(processedAudioFiles);

      const processedProgressive = progressive360.map((f) => ({
        type: (f.ext || '').toUpperCase() || 'VIDEO',
        quality: f.resolution || '360p',
        size: f.size || 'Unknown',
        height: 360,
        filenameBase: safeTitle,
        ext: f.ext || 'mp4'
      }));
      setProgressiveFiles(processedProgressive);

      // Video list is now Video Only
      const processedVideoFiles = video.map((f) => ({
        type: (f.ext || '').toUpperCase() || 'VIDEO',
        quality: f.resolution || (f.height ? `${f.height}p` : 'Unknown'),
        size: f.size || 'Unknown',
        height: f.height || undefined,
        formatId: f.format_id,
        ext: f.ext || 'mp4',
        filenameBase: safeTitle,
        directUrl: f.url || '#'
      }));
      setVideoFiles(processedVideoFiles);

      setIsLoading(false);
      showNotification("Video fetched successfully!", "success");
    } catch (error) {
      console.error("Error fetching video:", error);
      setIsLoading(false);
      showNotification("Failed to fetch video. Please check the URL.", "danger");
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const buildDownloadUrl = (file) => {
    if (file.formatId) {
      // For format-specific downloads (audio or specific video format)
      return `http://localhost:5000/api/download_id_get?url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(file.formatId)}&filename=${encodeURIComponent(file.filenameBase)}&ext=${encodeURIComponent(file.ext)}`;
    } else {
      // For best quality downloads
      return `http://localhost:5000/api/download_best_get?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(file.filenameBase)}`;
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset state when changing tabs
    setVideoUrl("");
    setThumbnail(null);
    setAudioFiles([]);
    setVideoFiles([]);
    setProgressiveFiles([]);
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Custom CSS for animations */}
      <style>
        {`
          .fade-in { animation: fadeIn 0.6s ease-in-out; }
          .slide-in { animation: slideIn 0.4s ease-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          .hover-scale { transition: transform 0.3s, box-shadow 0.3s; }
          .hover-scale:hover { transform: scale(1.03); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .btn-gradient { background: linear-gradient(to right, #4a6cf7, #2541b2); border: none; }
          .bg-gradient-primary { background: linear-gradient(to right, #4a6cf7, #2541b2); }
          .bg-gradient-dark { background: linear-gradient(to right, #343a40, #212529); }
          .step-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background-color: #4a6cf7; color: white; font-weight: bold; font-size: 1.25rem; margin: 0 auto 1rem auto; }
          .rotating { animation: rotating 2s linear infinite; }
          @keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}
      </style>

      {/* Removed preparing overlay */}

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark shadow w-100 bg-gradient-primary">
        <div className="container">
          <a className="navbar-brand fw-bold fs-3 d-flex align-items-center" href="#">
            <span className="bg-white text-primary rounded-circle p-1 me-2 d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px" }}>YI</span>
            Video Downloader
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className={`nav-link ${activeTab === "youtube" ? "active" : ""}`} href="#" onClick={() => handleTabChange("youtube")}>
                  YouTube
                </a>
              </li>
              <li className="nav-item">
                <a className={`nav-link ${activeTab === "instagram" ? "active" : ""}`} href="#" onClick={() => handleTabChange("instagram")}>
                  Instagram
                </a>
              </li>
              <li className="nav-item">
                <a className={`nav-link ${activeTab === "facebook" ? "active" : ""}`} href="#" onClick={() => handleTabChange("facebook")}>
                  Facebook
                </a>
              </li>
              <li className="nav-item ms-lg-3">
                <select className="form-select form-select-sm bg-primary text-white border-light">
                  <option>English</option>
                  <option>Español</option>
                  <option>Français</option>
                  <option>Deutsch</option>
                </select>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container mt-4 text-center" style={{ maxWidth: "900px" }}>
        {/* Hero Section */}
        <div className="mb-4 fade-in">
          <h1 className="display-5 fw-bold">Download {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Videos</h1>
          <p className="lead text-muted mx-auto" style={{ maxWidth: "600px" }}>
            Fast, free, and easy way to download high-quality videos from {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}.
            No registration required.
          </p>
        </div>

        {/* Input Box */}
        <div className="card shadow-sm hover-scale mb-4">
          <div className="card-body p-4">
            <div className="row g-3">
              <div className="col-md-9">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder={`Enter ${activeTab} video URL`}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <button
                  onClick={handleFetch}
                  disabled={isLoading}
                  className="btn btn-primary btn-lg w-100 btn-gradient"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="rotating me-2" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <span>Fetch Video</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`alert alert-${notification.type} d-flex align-items-center slide-in`} style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1050 }}>
            {notification.type === 'danger' && <FaExclamationTriangle className="me-2" />}
            {notification.type === 'success' && <FaCheckCircle className="me-2" />}
            {notification.type === 'info' && <FaDownload className="me-2" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Results Section */}
        {thumbnail && (
          <div className="mb-4 fade-in">
            <div className="card shadow">
              <div className="card-header bg-light">
                <h5 className="card-title mb-0">Video Preview</h5>
              </div>
              <div className="card-body p-4">
                <div className="row">
                  {/* Thumbnail */}
                  <div className="col-md-6 mb-3 mb-md-0">
                    <img
                      src={thumbnail}
                      alt="Video Thumbnail"
                      className="img-fluid rounded shadow-sm hover-scale"
                      style={{ transition: "transform 0.3s" }}
                    />
                  </div>

                  {/* Video Info */}
                  <div className="col-md-6">
                    <h5 className="mb-3">{videoTitle}</h5> {/* Display video title */}
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="bg-light p-3 rounded">
                          <small className="text-muted d-block">Platform</small>
                          <span className="fw-medium">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="bg-light p-3 rounded">
                          <small className="text-muted d-block">Duration</small>
                          <span className="fw-medium">{videoDuration}</span> {/* Display video duration */}
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="bg-light p-3 rounded">
                          <small className="text-muted d-block">Resolution</small>
                          <span className="fw-medium">Up to 4K</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="bg-light p-3 rounded">
                          <small className="text-muted d-block">File Size</small>
                          <span className="fw-medium">Dynamic</span> {/* Update file size to be dynamic */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Options */}
        {(audioFiles.length > 0 || progressiveFiles.length > 0 || videoFiles.length > 0) && (
          <div className="mb-4 fade-in">
            <div className="card shadow">
              <div className="card-header bg-light">
                <h5 className="card-title mb-0">Download Options</h5>
              </div>
              <div className="card-body p-4">
                {/* Audio Only (stacked section 1) */}
                <div className="mb-4">
                  <h5 className="mb-3 d-flex align-items-center">
                    <span className="badge bg-primary me-2 p-2"><i className="bi bi-music-note"></i></span>
                    Audio Only
                  </h5>
                  <div className="d-flex flex-column gap-2">
                    {audioFiles.length === 0 ? (
                      <div className="text-muted small">No audio formats found</div>
                    ) : audioFiles.map((file, index) => (
                      <div key={index} className="card bg-light border hover-scale">
                        <div className="card-body d-flex justify-content-between align-items-center p-3">
                          <div>
                            <span className="fw-medium">{file.type}</span>
                            <div className="small text-muted"><span>{file.quality}</span> • <span>{file.size}</span></div>
                          </div>
                          <a
                            href={`http://localhost:5000/api/download_id_get?url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(file.formatId)}&filename=${encodeURIComponent(file.filenameBase)}&ext=${encodeURIComponent(file.ext)}`}
                            className="btn btn-success"
                            onClick={() => showNotification(`Downloading ${file.type} audio...`, "info")}
                            download
                          >
                            <FaDownload className="me-1" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio + Video (360p) (stacked section 2) */}
                <div className="mb-4">
                  <h5 className="mb-3 d-flex align-items-center">
                    <span className="badge bg-info me-2 p-2"><i className="bi bi-camera-video"></i></span>
                    Audio + Video (360p)
                  </h5>
                  <div className="d-flex flex-column gap-2">
                    {progressiveFiles.length === 0 ? (
                      <div className="text-muted small">360p not available</div>
                    ) : progressiveFiles.map((file, index) => (
                      <div key={index} className="card bg-light border hover-scale">
                        <div className="card-body d-flex justify-content-between align-items-center p-3">
                          <div>
                            <span className="fw-medium">{file.type} {file.quality}</span>
                            <div className="small text-muted"><span>{file.size}</span></div>
                          </div>
                          <a 
                            href={buildDownloadUrl(file)} 
                            className="btn btn-info text-white"
                            onClick={() => showNotification(`Downloading video in ${file.quality}...`, "info")}
                            download
                          >
                            <FaDownload className="me-1" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video Only (stacked section 3) */}
                <div>
                  <h5 className="mb-3 d-flex align-items-center">
                    <span className="badge bg-danger me-2 p-2"><i className="bi bi-camera-video"></i></span>
                    Video Only
                  </h5>
                  <div className="d-flex flex-column gap-2">
                    {videoFiles.length === 0 ? (
                      <div className="text-muted small">No video formats found</div>
                    ) : videoFiles.map((file, index) => (
                      <div key={index} className="card bg-light border hover-scale">
                        <div className="card-body d-flex justify-content-between align-items-center p-3">
                          <div>
                            <span className="fw-medium">{file.type} {file.quality}</span>
                            <div className="small text-muted"><span>{file.size}</span></div>
                          </div>
                          <a 
                            href={buildDownloadUrl(file)} 
                            className="btn btn-primary"
                            onClick={() => showNotification(`Downloading ${file.quality} video...`, "info")}
                            download
                          >
                            <FaDownload className="me-1" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* How to Download */}
        <div className="mb-5">
          <h2 className="fw-bold mb-4">How to Download</h2>
          <div className="row g-4">
            {[
              {
                step: 1,
                title: "Copy the URL",
                description: `Copy the video URL from ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} that you want to download.`
              },
              {
                step: 2,
                title: "Paste & Fetch",
                description: "Paste the URL into the input box and click the Fetch button."
              },
              {
                step: 3,
                title: "Download",
                description: "Choose your preferred format and quality, then click Download."
              }
            ].map((item) => (
              <div key={item.step} className="col-md-4">
                <div className="card h-100 text-center hover-scale">
                  <div className="card-body p-4">
                    <div className="step-icon mb-3">{item.step}</div>
                    <h5 className="card-title">{item.title}</h5>
                    <p className="card-text text-muted">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-5">
          <h2 className="fw-bold mb-4">Frequently Asked Questions</h2>
          <div className="accordion" id="faqAccordion">
            {[
              {
                id: "faq1",
                question: "Is this service free to use?",
                answer: "Yes, YI Video Downloader is completely free to use with no hidden costs or limitations."
              },
              {
                id: "faq2",
                question: "Can I use this on mobile devices?",
                answer: "Absolutely! Our service is fully responsive and works on all devices including smartphones and tablets."
              },
              {
                id: "faq3",
                question: "Is it legal to download videos?",
                answer: "We encourage users to respect copyright laws. Only download videos that you have permission to or that are free to download."
              },
              {
                id: "faq4",
                question: "What is the maximum video quality available?",
                answer: "We support downloads up to the highest quality available from the source, including 4K resolution when available."
              },
              {
                id: "faq5",
                question: "How long does it take to process a video?",
                answer: "Most videos process within seconds, but longer or higher quality videos may take slightly longer."
              }
            ].map((item) => (
              <div key={item.id} className="accordion-item mb-2 hover-scale">
                <h2 className="accordion-header" id={`heading${item.id}`}>
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#${item.id}`}
                    aria-expanded="false"
                    aria-controls={item.id}
                  >
                    {item.question}
                  </button>
                </h2>
                <div id={item.id} className="accordion-collapse collapse" aria-labelledby={`heading${item.id}`} data-bs-parent="#faqAccordion">
                  <div className="accordion-body">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-5">
          <h2 className="fw-bold mb-4">Why Choose YI Video</h2>
          <div className="row g-4">
            {[
              {
                title: "Fast & Reliable",
                description: "Our servers process your downloads quickly and efficiently.",
                icon: "⚡"
              },
              {
                title: "No Registration",
                description: "No sign-up or account creation needed. Just paste and download.",
                icon: "🔒"
              },
              {
                title: "Multiple Platforms",
                description: "Download from YouTube, Instagram, Facebook, and more platforms.",
                icon: "🌐"
              }
            ].map((item, index) => (
              <div key={index} className="col-md-4">
                <div className="card h-100 text-center hover-scale">
                  <div className="card-body p-4">
                    <div className="fs-1 mb-3">{item.icon}</div>
                    <h5 className="card-title">{item.title}</h5>
                    <p className="card-text text-muted">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-dark text-white py-4 mt-auto">
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-4 mb-md-0">
              <h5 className="fw-bold mb-3 text-white">YI Video</h5>
              <p className="text-white">
                The fastest way to download videos from YouTube, Instagram, Facebook, and more.
              </p>
            </div>
            <div className="col-md-4 mb-4 mb-md-0">
              <h5 className="fw-bold mb-3 text-white">Quick Links</h5>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white text-decoration-none hover-text-white">Home</a></li>
                <li className="mb-2"><a href="#" className="text-white text-decoration-none hover-text-white">About Us</a></li>
                <li className="mb-2"><a href="#" className="text-white text-decoration-none hover-text-white">Privacy Policy</a></li>
                <li><a href="#" className="text-white text-decoration-none hover-text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div className="col-md-4">
              <h5 className="fw-bold mb-3 text-white">Support</h5>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="#" className="text-white text-decoration-none hover-text-white">FAQ</a></li>
                <li className="mb-2"><a href="#" className="text-white text-decoration-none hover-text-white">Contact Us</a></li>
                <li><a href="#" className="text-white text-decoration-none hover-text-white">Feedback</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-white mt-4 pt-3 border-top border-secondary">
            <p className="mb-0">© {new Date().getFullYear()} YI Video. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}