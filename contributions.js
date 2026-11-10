const OWNER = "mohdadil1";
const REPOSITORY = "College-Diaries";

const API_URL =
    `https://api.github.com/repos/${OWNER}/${REPOSITORY}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=30`;

const CACHE_KEY = "contributions-cache";
const CACHE_MINUTES = 5;

// GitHub username -> real name. Add more as needed.
const NAMES = {
    surajdas172345: "Suraj Das"
};

const bell = document.getElementById("contributionBell");
const panel = document.getElementById("contributionPanel");
const closeButton = document.getElementById("closeContributions");
const list = document.getElementById("contributionList");
const count = document.getElementById("notificationCount");

function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"} ago`;
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return plural(minutes, "minute");

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return plural(hours, "hour");

    const days = Math.floor(hours / 24);
    if (days < 30) return plural(days, "day");

    return new Date(date).toLocaleDateString();
}

function readCache() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if (cached && Date.now() - cached.time < CACHE_MINUTES * 60000) {
            return cached.data;
        }
    } catch (e) {}
    return null;
}

function writeCache(data) {
    try {
        sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ time: Date.now(), data })
        );
    } catch (e) {}
}

async function fetchContributions() {
    const cached = readCache();
    if (cached) return cached;

    const response = await fetch(API_URL, {
        headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
        throw new Error("GitHub API request failed");
    }

    const pullRequests = await response.json();

    // Only PRs actually merged into main, newest first
    const contributions = pullRequests
        .filter(pr => pr.merged_at !== null)
        .sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at))
        .map(pr => ({
            login: pr.user?.login ?? "Unknown",
            title: pr.title,
            url: pr.html_url,
            mergedAt: pr.merged_at
        }));

    writeCache(contributions);
    return contributions;
}

async function loadContributions() {
    list.textContent = "Loading contributions...";

    try {
        const contributions = await fetchContributions();

        list.replaceChildren();

        count.textContent = contributions.length > 9 ? "9+" : contributions.length;
        count.hidden = contributions.length === 0;

        if (contributions.length === 0) {
            list.textContent = "No contributions yet.";
            return;
        }

        contributions.forEach(item => {
            const li = document.createElement("li");
            li.className = "contribution-item";

            const link = document.createElement("a");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const author = document.createElement("span");
            author.className = "contribution-author";
            author.textContent = NAMES[item.login] || item.login;

            const message = document.createElement("span");
            message.textContent = " contributed: " + item.title;

            const time = document.createElement("span");
            time.className = "contribution-time";
            time.textContent = timeAgo(item.mergedAt);

            link.append(author, message, time);
            li.appendChild(link);
            list.appendChild(li);
        });
    } catch (error) {
        list.textContent = "Unable to load contributions. Please try again later.";
        count.hidden = true;
        console.error(error);
    }
}

function closePanel() {
    panel.hidden = true;
    bell.setAttribute("aria-expanded", "false");
}

bell.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    bell.setAttribute("aria-expanded", String(!panel.hidden));
});

closeButton.addEventListener("click", closePanel);

document.addEventListener("click", event => {
    if (!event.target.closest(".contribution-widget")) closePanel();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePanel();
});

loadContributions();