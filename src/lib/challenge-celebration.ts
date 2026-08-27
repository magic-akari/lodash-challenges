import confetti from "canvas-confetti";

export function launchSuccessConfetti() {
	const duration = 500;
	const end = Date.now() + duration;
	const shapes = [
		"square" as const,
		"circle" as const,
		"square" as const,
		"circle" as const,
		...createStreamerShapes(),
	];
	const defaults = {
		colors: ["#2563eb", "#10b981", "#f97316", "#facc15", "#ec4899"],
		disableForReducedMotion: true,
		particleCount: 3,
		shapes,
		spread: 64,
		startVelocity: 48,
		ticks: 180,
		zIndex: 9999,
	};

	function frame() {
		fire({
			...defaults,
			angle: 60,
			origin: { x: 0, y: 0.78 },
		});
		fire({
			...defaults,
			angle: 120,
			origin: { x: 1, y: 0.78 },
		});
		fire({
			...defaults,
			angle: 45,
			origin: { x: 0, y: 0.58 },
			particleCount: 2,
			startVelocity: 38,
		});
		fire({
			...defaults,
			angle: 135,
			origin: { x: 1, y: 0.58 },
			particleCount: 2,
			startVelocity: 38,
		});

		if (Date.now() < end) {
			window.requestAnimationFrame(frame);
		}
	}

	frame();
}

function fire(options: Parameters<typeof confetti>[0]) {
	confetti({
		...options,
		scalar: randomBetween(1.12, 1.26),
	});
}

function createStreamerShapes() {
	const streamerPath =
		"M4 44 C20 6 46 6 62 44 C78 82 104 82 120 44 C136 6 162 6 178 44 C194 82 220 82 236 44 C246 20 260 14 272 24 L272 44 C260 34 252 38 244 56 C226 100 190 100 170 56 C154 18 136 18 120 56 C100 100 64 100 46 56 C38 38 28 34 16 48 Z";
	const curledPath =
		"M4 32 C22 2 42 62 60 32 C78 2 98 62 116 32 C134 2 154 62 172 32 C190 2 210 62 228 32 C244 6 258 8 272 24 L272 44 C256 30 246 30 236 50 C216 88 194 28 176 50 C156 88 138 28 120 50 C100 88 82 28 64 50 C44 88 28 28 12 50 Z";
	return [
		confetti.shapeFromPath({
			path: streamerPath,
			matrix: streamerMatrix(138, 48, streamerLengthScale(), streamerThicknessScale()),
		}),
		confetti.shapeFromPath({
			path: curledPath,
			matrix: streamerMatrix(138, 45, streamerLengthScale(), streamerThicknessScale()),
		}),
		confetti.shapeFromPath({
			path: streamerPath,
			matrix: streamerMatrix(138, 48, streamerLengthScale(), streamerThicknessScale()),
		}),
	];
}

function streamerMatrix(centerX: number, centerY: number, scaleX: number, scaleY: number) {
	return [scaleX, 0, 0, scaleY, -centerX * scaleX, -centerY * scaleY] as unknown as DOMMatrix;
}

function streamerLengthScale() {
	return randomBetween(0.084, 0.096);
}

function streamerThicknessScale() {
	return randomBetween(0.094, 0.104);
}

function randomBetween(min: number, max: number) {
	return min + Math.random() * (max - min);
}
