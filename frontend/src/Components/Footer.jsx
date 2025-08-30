import React from 'react'

export default function Footer() {
    return (
        <>
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
        </>
    )
}
