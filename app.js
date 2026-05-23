const PLAYERS = ["Mitya", "Maja", "Ines"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validateGames(games) {
  if (!Array.isArray(games)) {
    throw new Error("data/games.json must be a JSON array");
  }

  games.forEach((game, index) => {
    const label = `Game #${index + 1}`;
    if (!game || typeof game !== "object" || Array.isArray(game)) {
      throw new Error(`${label}: must be an object`);
    }
    if (typeof game.date !== "string" || !DATE_RE.test(game.date)) {
      throw new Error(`${label}: date must be YYYY-MM-DD`);
    }
    for (const player of PLAYERS) {
      const score = game[player];
      if (typeof score !== "number" || !Number.isFinite(score)) {
        throw new Error(`${label}: ${player} must be a number`);
      }
    }
  });
}

function winners(game) {
  return PLAYERS.filter((player) => game[player] === 0);
}

function computeStats(games) {
  const stats = Object.fromEntries(
    PLAYERS.map((player) => [player, { wins: 0, totalPoints: 0 }]),
  );

  for (const game of games) {
    for (const player of PLAYERS) {
      stats[player].totalPoints += game[player];
    }
    for (const winner of winners(game)) {
      stats[winner].wins += 1;
    }
  }

  return stats;
}

function sortByWins(stats) {
  return [...PLAYERS].sort((a, b) => {
    const diff = stats[b].wins - stats[a].wins;
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

function sortByPoints(stats) {
  return [...PLAYERS].sort((a, b) => {
    const diff = stats[a].totalPoints - stats[b].totalPoints;
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

function sortGamesByDate(games) {
  return [...games]
    .map((game, index) => ({ ...game, _index: index }))
    .sort((a, b) => {
      const dateSort = b.date.localeCompare(a.date);
      return dateSort !== 0 ? dateSort : b._index - a._index;
    });
}

function renderLeaderboard(elementId, ordered, stats, valueKey, valueLabel) {
  document.getElementById(elementId).innerHTML = ordered
    .map((player, index) => {
      const previous = index > 0 ? ordered[index - 1] : null;
      const value = stats[player][valueKey];
      const previousValue = previous ? stats[previous][valueKey] : null;
      const tied = previous !== null && value === previousValue;
      const rank = tied ? "-" : String(index + 1);

      return `<li><span class="rank">${rank}</span><span class="name">${escapeHtml(
        player,
      )}</span><span class="value">${value} ${valueLabel}</span></li>`;
    })
    .join("");
}

function renderSummary(games, stats) {
  document.getElementById("summary-body").innerHTML = PLAYERS.map((player) => {
    return `<tr><td>${escapeHtml(player)}</td><td>${games.length}</td><td>${
      stats[player].wins
    }</td><td>${stats[player].totalPoints}</td></tr>`;
  }).join("");
}

function renderGameLog(games) {
  document.getElementById("game-log-body").innerHTML = games
    .map((game) => {
      const winnerNames = winners(game);
      const winnerCell =
        winnerNames.length > 0 ? winnerNames.map(escapeHtml).join(", ") : "-";
      const scoreCells = PLAYERS.map(
        (player) => `<td>${game[player]}</td>`,
      ).join("");

      return `<tr><td>${escapeHtml(
        game.date,
      )}</td>${scoreCells}<td>${winnerCell}</td></tr>`;
    })
    .join("");
}

function render(games) {
  const sortedGames = sortGamesByDate(games);
  const stats = computeStats(games);
  renderLeaderboard("wins-list", sortByWins(stats), stats, "wins", "wins");
  renderLeaderboard(
    "points-list",
    sortByPoints(stats),
    stats,
    "totalPoints",
    "pts",
  );
  renderSummary(games, stats);
  renderGameLog(sortedGames);
  document.getElementById("games-count").textContent = `${games.length} game${
    games.length === 1 ? "" : "s"
  } logged`;
  document.getElementById("status").remove();
}

async function init() {
  try {
    const response = await fetch("data/games.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load data/games.json");
    }
    const games = await response.json();
    validateGames(games);
    render(games);
  } catch (error) {
    const status = document.getElementById("status");
    status.className = "error";
    // Opening index.html directly as file:// can block fetching data/games.json.
    status.textContent = error.message;
  }
}

init();
