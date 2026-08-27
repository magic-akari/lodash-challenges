import {
	ACCEPTED_PROBLEM_IDS_KEY,
	CHALLENGE_PROGRESS_UPDATED_EVENT,
	getAcceptedProblemIds,
} from "./challenge-progress";

export const TOC_SCROLL_POSITION_KEY = "lodash-challenges:toc-scroll-position";

export function mountChallengeNavigation() {
	const searchInput = document.querySelector<HTMLInputElement>("[data-search-input]");
	const tocContainer = document.querySelector<HTMLElement>(".toc-container");
	const tocToggle = document.querySelector<HTMLInputElement>("#toc-toggle");
	const items = Array.from(document.querySelectorAll("[data-toc-item]"));
	const problemLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-problem-id]"));
	const groupToggles = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-toc-group-toggle]"));

	tocContainer
		?.querySelector<HTMLElement>('[aria-current="page"]')
		?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });

	function restoreScrollPosition() {
		const storageKey = tocContainer?.dataset.scrollPositionKey;
		if (!tocContainer || !storageKey) return;

		const savedPosition = sessionStorage.getItem(storageKey);
		if (savedPosition === null) return;

		const scrollTop = Number.parseFloat(savedPosition);
		if (!Number.isFinite(scrollTop)) return;
		tocContainer.scrollTop = Math.max(0, scrollTop);
	}

	function saveScrollPosition() {
		const storageKey = tocContainer?.dataset.scrollPositionKey;
		if (!tocContainer || !storageKey) return;
		sessionStorage.setItem(storageKey, String(tocContainer.scrollTop));
	}

	function renderAcceptedProblems() {
		const acceptedProblemIds = getAcceptedProblemIds();
		for (const link of problemLinks) {
			const problemId = link.dataset.problemId;
			const status = link.querySelector<HTMLElement>("[data-accepted-status]");
			if (!status) continue;
			status.hidden = !problemId || !acceptedProblemIds.has(problemId);
		}
	}

	renderAcceptedProblems();

	window.addEventListener(CHALLENGE_PROGRESS_UPDATED_EVENT, renderAcceptedProblems);
	window.addEventListener("pagehide", saveScrollPosition);
	window.addEventListener("storage", (event) => {
		if (event.key === null || event.key === ACCEPTED_PROBLEM_IDS_KEY) {
			renderAcceptedProblems();
		}
	});

	tocToggle?.addEventListener("change", () => {
		if (!tocToggle.checked) return;
		window.requestAnimationFrame(restoreScrollPosition);
	});

	searchInput?.addEventListener("input", () => {
		const value = searchInput.value.trim().toLowerCase().replace(/^_\.?/, "");
		for (const item of items) {
			const text = item.getAttribute("data-search-text")?.toLowerCase() || "";
			item.classList.toggle("hidden", Boolean(value) && !text.includes(value));
		}
	});

	for (const toggle of groupToggles) {
		toggle.addEventListener("click", () => {
			const listId = toggle.getAttribute("aria-controls");
			const list = listId ? document.getElementById(listId) : null;
			if (!list) return;

			const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
			const category = toggle.dataset.category || "";
			const action = nextExpanded ? "Collapse" : "Expand";

			list.hidden = !nextExpanded;
			toggle.setAttribute("aria-expanded", String(nextExpanded));
			toggle.setAttribute("aria-label", `${action} ${category} category`);
		});
	}

	document.addEventListener("keydown", (event) => {
		const key = event.key.toLowerCase();
		const isSearchShortcut = key === "k" && (event.metaKey || event.ctrlKey);
		if (!isSearchShortcut) return;

		event.preventDefault();
		if (tocToggle) tocToggle.checked = true;

		window.requestAnimationFrame(() => {
			tocContainer?.scrollTo({ top: 0, behavior: "smooth" });
			searchInput?.focus();
		});
	});
}
