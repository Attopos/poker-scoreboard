const STORAGE_KEY = "poker_scoreboard_state_v1";
const MAX_LOGS = 200;
const PLAYER_NAMES = ["帅帅", "昉昉", "星星"];
const INITIAL_SCORE = 10;
const CHART_COLORS = ["#c92d2d", "#3c6fd1", "#2f9b55"];
const CHART_FONT_FAMILY = '"KaiTi", "STKaiti", "Kaiti SC", "Songti SC", serif';

const defaultState = () => ({
    scores: [INITIAL_SCORE, INITIAL_SCORE, INITIAL_SCORE],
    logs: []
});

let state = defaultState();

const scoreEls = Array.from(document.querySelectorAll(".score"));
const gameLogBodyEl = document.getElementById("gameLogBody");
const submitBtn = document.getElementById("submitBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");

let landlordPieCanvas;
let scoreLineCanvas;

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return defaultState();
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.scores) || parsed.scores.length !== 3) {
            return defaultState();
        }
        if (!Array.isArray(parsed.logs)) {
            return defaultState();
        }

        return {
            scores: parsed.scores.map((value) => Number(value) || 0),
            logs: parsed.logs.slice(0, MAX_LOGS)
        };
    } catch (error) {
        console.error("读取本地数据失败，已使用默认状态。", error);
        return defaultState();
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("保存本地数据失败。", error);
    }
}

function formatDelta(value) {
    return value > 0 ? `+${value}` : `${value}`;
}

function renderScores() {
    scoreEls.forEach((el, index) => {
        el.textContent = state.scores[index];
    });
}

function renderLogs() {
    gameLogBodyEl.innerHTML = "";

    if (state.logs.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = '<td colspan="6">暂无对局记录</td>';
        gameLogBodyEl.appendChild(emptyRow);
        return;
    }

    state.logs.forEach((log) => {
        const row = document.createElement("tr");
        const deltaText = log.delta.map((value, idx) => `${PLAYER_NAMES[idx]} ${formatDelta(value)}`).join(" | ");
        const winnerText = log.winner === "landlord" ? "地主胜" : "农民胜";
        row.innerHTML = `
            <td>第 ${log.round} 局</td>
            <td>${PLAYER_NAMES[log.landlordIndex]}</td>
            <td>${winnerText}</td>
            <td>${deltaText}</td>
            <td>${log.scoresAfter.join(" / ")}</td>
            <td>${log.time}</td>
        `;
        gameLogBodyEl.appendChild(row);
    });
}

function renderAll() {
    renderScores();
    renderLogs();
    renderCharts();
}

function createRoundDelta(landlordIndex, winner) {
    const delta = [-1, -1, -1];

    if (winner === "landlord") {
        delta[landlordIndex] = 2;
        return delta;
    }

    delta[landlordIndex] = -2;
    for (let i = 0; i < delta.length; i += 1) {
        if (i !== landlordIndex) {
            delta[i] = 1;
        }
    }
    return delta;
}

function submitRound() {
    const landlordChoice = document.querySelector("input[name='landlord']:checked");
    const winnerChoice = document.querySelector("input[name='winner']:checked");
    if (!landlordChoice || !winnerChoice) {
        window.alert("请选择地主和胜方。");
        return;
    }

    const landlordIndex = Number(landlordChoice.value) - 1;
    const winner = winnerChoice.value;
    const delta = createRoundDelta(landlordIndex, winner);

    state.scores = state.scores.map((score, index) => score + delta[index]);

    const log = {
        round: state.logs.length + 1,
        landlordIndex,
        winner,
        delta,
        scoresAfter: [...state.scores],
        time: new Date().toLocaleString("zh-CN")
    };

    state.logs.unshift(log);
    if (state.logs.length > MAX_LOGS) {
        state.logs = state.logs.slice(0, MAX_LOGS);
    }

    saveState();
    renderAll();
}

function undoLastRound() {
    if (state.logs.length === 0) {
        window.alert("当前没有可撤销的对局。");
        return;
    }

    const lastLog = state.logs.shift();
    state.scores = state.scores.map((score, index) => score - lastLog.delta[index]);

    saveState();
    renderAll();
}

function resetAll() {
    const confirmed = window.confirm("你确定要清除全部数据吗？");
    if (!confirmed) {
        return;
    }

    state = defaultState();
    saveState();
    renderAll();
}

function ensureChartSection() {
    let chartSectionEl = document.getElementById("chartSection");
    if (chartSectionEl) {
        landlordPieCanvas = document.getElementById("landlordPieChart");
        scoreLineCanvas = document.getElementById("scoreLineChart");
        return;
    }

    chartSectionEl = document.createElement("div");
    chartSectionEl.id = "chartSection";
    chartSectionEl.style.width = "min(980px, 100%)";
    chartSectionEl.style.marginTop = "18px";
    chartSectionEl.style.padding = "16px";
    chartSectionEl.style.borderRadius = "16px";
    chartSectionEl.style.border = "2px solid rgba(237, 206, 137, 0.65)";
    chartSectionEl.style.background = "rgba(18, 37, 26, 0.78)";
    chartSectionEl.style.color = "#f8efd8";
    chartSectionEl.style.boxShadow = "0 14px 30px rgba(0, 0, 0, 0.28)";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "数据图表";
    titleEl.style.margin = "0 0 14px";
    titleEl.style.padding = "2px 12px 4px";
    titleEl.style.fontSize = "34px";
    titleEl.style.lineHeight = "1";
    titleEl.style.fontWeight = "800";
    titleEl.style.letterSpacing = "3px";
    titleEl.style.textAlign = "center";
    titleEl.style.color = "#f7ebc8";
    titleEl.style.textShadow = "0 2px 0 rgba(107, 30, 9, 0.75)";
    titleEl.style.borderBottom = "2px solid rgba(247, 228, 181, 0.45)";
    titleEl.style.fontFamily = CHART_FONT_FAMILY;

    const gridEl = document.createElement("div");
    gridEl.style.display = "grid";
    gridEl.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
    gridEl.style.gap = "14px";
    gridEl.style.alignItems = "stretch";

    const pieCardEl = document.createElement("div");
    pieCardEl.style.background = "rgba(248, 238, 212, 0.08)";
    pieCardEl.style.border = "1px solid rgba(255, 230, 176, 0.28)";
    pieCardEl.style.borderRadius = "10px";
    pieCardEl.style.padding = "10px";

    const pieTitleEl = document.createElement("h4");
    pieTitleEl.textContent = "地主上庄分布";
    pieTitleEl.style.margin = "0 0 10px";
    pieTitleEl.style.fontSize = "20px";
    pieTitleEl.style.textAlign = "center";
    pieTitleEl.style.fontFamily = CHART_FONT_FAMILY;
    pieTitleEl.style.color = "#f2dfb0";
    pieTitleEl.style.letterSpacing = "1px";

    landlordPieCanvas = document.createElement("canvas");
    landlordPieCanvas.id = "landlordPieChart";
    landlordPieCanvas.style.width = "100%";
    landlordPieCanvas.style.height = "280px";
    landlordPieCanvas.style.borderRadius = "8px";
    landlordPieCanvas.style.background = "rgba(15, 32, 23, 0.56)";

    const lineCardEl = document.createElement("div");
    lineCardEl.style.background = "rgba(248, 238, 212, 0.08)";
    lineCardEl.style.border = "1px solid rgba(255, 230, 176, 0.28)";
    lineCardEl.style.borderRadius = "10px";
    lineCardEl.style.padding = "10px";

    const lineTitleEl = document.createElement("h4");
    lineTitleEl.textContent = "得分变化趋势";
    lineTitleEl.style.margin = "0 0 10px";
    lineTitleEl.style.fontSize = "20px";
    lineTitleEl.style.textAlign = "center";
    lineTitleEl.style.fontFamily = CHART_FONT_FAMILY;
    lineTitleEl.style.color = "#f2dfb0";
    lineTitleEl.style.letterSpacing = "1px";

    scoreLineCanvas = document.createElement("canvas");
    scoreLineCanvas.id = "scoreLineChart";
    scoreLineCanvas.style.width = "100%";
    scoreLineCanvas.style.height = "280px";
    scoreLineCanvas.style.borderRadius = "8px";
    scoreLineCanvas.style.background = "rgba(15, 32, 23, 0.56)";

    pieCardEl.appendChild(pieTitleEl);
    pieCardEl.appendChild(landlordPieCanvas);
    lineCardEl.appendChild(lineTitleEl);
    lineCardEl.appendChild(scoreLineCanvas);
    gridEl.appendChild(pieCardEl);
    gridEl.appendChild(lineCardEl);
    chartSectionEl.appendChild(titleEl);
    chartSectionEl.appendChild(gridEl);

    const logSection = document.getElementById("logSection");
    if (logSection && logSection.parentNode) {
        logSection.parentNode.insertBefore(chartSectionEl, logSection);
    } else {
        document.body.appendChild(chartSectionEl);
    }
}

function getCanvasContext(canvas, cssWidth, cssHeight) {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
}

function drawEmptyText(ctx, width, height, text) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(248, 239, 216, 0.85)";
    ctx.font = `700 18px ${CHART_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2);
}

function drawChartBackdrop(ctx, width, height) {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "rgba(31, 82, 56, 0.72)");
    bg.addColorStop(1, "rgba(20, 50, 35, 0.82)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 222, 143, 0.12)";
    ctx.lineWidth = 1;
    for (let x = -height; x < width + height; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(241, 205, 125, 0.38)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
}

function fillRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    ctx.fill();
}

function renderLandlordPieChart() {
    if (!landlordPieCanvas) {
        return;
    }

    const width = landlordPieCanvas.clientWidth || 300;
    const height = 280;
    const ctx = getCanvasContext(landlordPieCanvas, width, height);
    const counts = [0, 0, 0];
    state.logs.forEach((log) => {
        if (typeof log.landlordIndex === "number" && log.landlordIndex >= 0 && log.landlordIndex < 3) {
            counts[log.landlordIndex] += 1;
        }
    });

    const total = counts.reduce((sum, value) => sum + value, 0);
    if (total === 0) {
        drawEmptyText(ctx, width, height, "暂无对局数据");
        return;
    }

    ctx.clearRect(0, 0, width, height);
    drawChartBackdrop(ctx, width, height);
    const centerX = width * 0.34;
    const centerY = height * 0.5;
    const radius = Math.min(width * 0.2, 88);
    let start = -Math.PI / 2;

    counts.forEach((value, index) => {
        const angle = (value / total) * Math.PI * 2;
        const end = start + angle;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = CHART_COLORS[index];
        ctx.fill();
        ctx.strokeStyle = "rgba(252, 235, 191, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        start = end;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(253, 223, 147, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(18, 37, 26, 0.92)";
    ctx.fill();

    ctx.fillStyle = "#f8efd8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 18px ${CHART_FONT_FAMILY}`;
    ctx.fillText(`${total} 局`, centerX, centerY - 8);
    ctx.font = `700 13px ${CHART_FONT_FAMILY}`;
    ctx.fillStyle = "#e5c273";
    ctx.fillText("地主局", centerX, centerY + 12);

    const legendStartX = width * 0.58;
    const rowGap = 34;
    counts.forEach((value, index) => {
        const y = height * 0.3 + index * rowGap;
        const percent = ((value / total) * 100).toFixed(1);
        ctx.fillStyle = CHART_COLORS[index];
        fillRoundedRect(ctx, legendStartX, y - 9, 16, 16, 4);
        ctx.fillStyle = "#f8efd8";
        ctx.textAlign = "left";
        ctx.font = `700 15px ${CHART_FONT_FAMILY}`;
        ctx.fillText(`${PLAYER_NAMES[index]}  ${value}次  ${percent}%`, legendStartX + 24, y + 1);
    });
}

function buildScoreSeries() {
    const logsByRound = [...state.logs].reverse();
    const series = PLAYER_NAMES.map(() => [INITIAL_SCORE]);
    logsByRound.forEach((log) => {
        const prev = series.map((values) => values[values.length - 1]);
        const next = prev.map((score, idx) => score + (log.delta?.[idx] || 0));
        next.forEach((score, idx) => series[idx].push(score));
    });
    return series;
}

function renderScoreLineChart() {
    if (!scoreLineCanvas) {
        return;
    }

    const width = scoreLineCanvas.clientWidth || 300;
    const height = 280;
    const ctx = getCanvasContext(scoreLineCanvas, width, height);
    const series = buildScoreSeries();
    const rounds = series[0].length - 1;

    ctx.clearRect(0, 0, width, height);
    drawChartBackdrop(ctx, width, height);
    if (series[0].length === 0) {
        drawEmptyText(ctx, width, height, "暂无得分数据");
        return;
    }

    const padding = { left: 42, right: 12, top: 16, bottom: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const allValues = series.flat();
    const minScore = Math.min(...allValues);
    const maxScore = Math.max(...allValues);
    const spread = Math.max(2, maxScore - minScore);
    const yMin = minScore - 1;
    const yMax = maxScore + 1;

    const xFor = (round) => padding.left + (rounds === 0 ? 0 : (round / rounds) * chartW);
    const yFor = (score) => padding.top + ((yMax - score) / (yMax - yMin)) * chartH;

    ctx.strokeStyle = "rgba(255, 230, 176, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= spread + 2; i += 1) {
        const score = yMin + (i / (spread + 2)) * (yMax - yMin);
        const y = yFor(score);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 230, 176, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    const yTickCount = Math.min(5, spread + 2);
    ctx.fillStyle = "#f8efd8";
    ctx.font = `700 12px ${CHART_FONT_FAMILY}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= yTickCount; i += 1) {
        const score = yMin + ((yTickCount - i) / yTickCount) * (yMax - yMin);
        ctx.fillText(Math.round(score), padding.left - 6, yFor(score));
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xTickCount = Math.min(6, rounds);
    for (let i = 0; i <= xTickCount; i += 1) {
        const round = xTickCount === 0 ? 0 : Math.round((i / xTickCount) * rounds);
        const label = round === 0 ? "开局" : `第${round}局`;
        ctx.fillText(label, xFor(round), height - padding.bottom + 6);
    }

    series.forEach((points, index) => {
        ctx.strokeStyle = CHART_COLORS[index];
        ctx.fillStyle = CHART_COLORS[index];
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        points.forEach((score, round) => {
            const x = xFor(round);
            const y = yFor(score);
            if (round === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        points.forEach((score, round) => {
            const x = xFor(round);
            const y = yFor(score);
            ctx.beginPath();
            ctx.arc(x, y, 4.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "#f8efd8";
            ctx.fill();
            ctx.fillStyle = CHART_COLORS[index];
        });
    });

    const legendX = padding.left + 8;
    PLAYER_NAMES.forEach((name, index) => {
        const y = 18 + index * 18;
        ctx.fillStyle = CHART_COLORS[index];
        fillRoundedRect(ctx, legendX, y - 8, 14, 14, 4);
        ctx.fillStyle = "#f8efd8";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = `700 13px ${CHART_FONT_FAMILY}`;
        ctx.fillText(name, legendX + 18, y - 1);
    });
}

function renderCharts() {
    ensureChartSection();
    renderLandlordPieChart();
    renderScoreLineChart();
}

submitBtn.addEventListener("click", submitRound);
undoBtn.addEventListener("click", undoLastRound);
resetBtn.addEventListener("click", resetAll);
window.addEventListener("resize", renderCharts);

state = loadState();
renderAll();
