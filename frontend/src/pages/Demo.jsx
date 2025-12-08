


import React from "react";

const Demo = () => {
	return (
		<div className="min-h-screen w-full bg-[#f5f5f5] px-0 py-12" style={{ fontFamily: "'IBM Plex Mono', monospace, system-ui" }}>
			{/* Download Extension Section */}
			<div className="w-full flex flex-col items-center mb-8">
				<h2 className="text-3xl font-bold mb-4 tracking-tight text-black">QuickApply Extension</h2>
				<a
					href="https://github.com/Peppo1710/QuickApply/releases/download/extension/extension.zip"
					className="px-8 py-3 bg-black text-white rounded font-medium hover:bg-gray-900 transition-colors text-lg"
					download
				>
					Download Extension Here
				</a>
			</div>

			{/* Video Section */}
			<div className="w-full flex flex-col items-center">
				<div className="w-full aspect-video max-w-5xl mx-auto rounded-lg overflow-hidden shadow border border-[#e0e0e0]">
					<iframe
						className="w-full h-full"
						src="https://www.youtube.com/embed/ldhkWV5QiP4"
						title="Demo Video"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						style={{ minHeight: 320 }}
					></iframe>
				</div>
				<p className="mt-6 text-base text-gray-700 font-medium text-center">Watch the demo to see how QuickApply can supercharge your job applications!</p>
			</div>
		</div>
	);
};

export default Demo;