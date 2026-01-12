import React from "react";
import { Link } from 'react-router-dom';

const Demo = () => {
	return (
		<div>
			{/* Hero Section */}
			<section className="pt-32 pb-12 px-6 lg:px-8 max-w-4xl mx-auto text-center">
				<h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
					See It In Action
				</h1>
				<p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
					Watch how Quick Apply automates your job search.
					Download the extension to get started immediately.
				</p>
			</section>

			{/* Video Section */}
			<section className="pb-20 px-6 lg:px-8 max-w-6xl mx-auto">
				<div
					className="w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-black"
					style={{ border: '2px solid #000' }}
				>
					<iframe
						className="w-full h-full"
						src="./video.mp4"
						title="Demo Video"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					></iframe>
				</div>
			</section>

			{/* Download CTA */}
			<section className="pb-32 px-6 lg:px-8 max-w-4xl mx-auto text-center">
				<div
					className="p-12 rounded-lg bg-white"
					style={{ border: '2px solid #000' }}
				>
					<h2 className="text-3xl font-bold mb-6">Ready to apply faster?</h2>
					<p className="text-gray-600 mb-8 max-w-lg mx-auto">
						Get the Chrome extension and start applying to LinkedIn jobs with a single click.
					</p>
					<a
						href="https://github.com/Peppo1710/QuickApply/releases/download/extension/extension.zip"
						className="px-8 py-4 bg-black text-white rounded font-bold hover:bg-gray-900 transition-colors inline-flex items-center gap-3 text-lg"
						download
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" y1="15" x2="12" y2="3" />
						</svg>
						Download Extension
					</a>
					<p className="mt-4 text-sm text-gray-500">
						Version 1.0.0 • Free for everyone
					</p>
				</div>
			</section>
		</div>
	);
};

export default Demo;