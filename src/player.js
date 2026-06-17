const video = document.getElementById("channelVideo");
const logo = document.getElementById("channelLogo");
const liveBadge = document.getElementById("liveBadge");
const nowTitle = document.getElementById("nowTitle");
const nowMeta = document.getElementById("nowMeta");
const nextMeta = document.getElementById("nextMeta");
const progressFill = document.getElementById("progressFill");
const offair = document.getElementById("offairScreen");
const offairTitle = document.getElementById("offairTitle");
const offairMessage = document.getElementById("offairMessage");

let schedule = null;
let settings = null;
let currentKey = null;
let lastVersionKey = null;

function timeToSec(value) {
  const [h, m, s = 0] = String(value || "00:00").split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}
function totalDuration(items) { return (items || []).reduce((sum, item) => sum + Number(item.duration || 0), 0); }
function ratingLabel(r) { return r === "A" ? "A · Todos os públicos" : `+${r}`; }
function dateISO(d = new Date()) { return d.toISOString().slice(0, 10); }

function isWithinBroadcastHours(now, config) {
  if (!config || config.channelMode === "24-7") return true;
  const start = timeToSec(config.broadcastStart || "00:00");
  const end = timeToSec(config.broadcastEnd || "23:59");
  const current = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

function getCurrentDaySlot(now = new Date()) {
  const day = (schedule?.days || []).find((d) => d.date === dateISO(now));
  if (!day) return null;
  const items = day.items || [];
  if (!items.length) return null;
  const current = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const start = timeToSec(day.startTime || settings?.broadcastStart || "00:00");
  const endConfigured = timeToSec(day.endTime || settings?.broadcastEnd || "23:59");
  const position = current - start;
  if (position < 0) return { offair: true, reason: `A emissão começa às ${day.startTime}.` };

  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const duration = Number(items[i].duration || 0);
    if (position >= acc && position < acc + duration) {
      return { item: items[i], index: i, offset: position - acc, duration, next: items[i + 1], day };
    }
    acc += duration;
  }

  if (settings?.channelMode === "24-7" && settings?.loopSchedule) {
    const total = totalDuration(items);
    if (total > 0) {
      const loopPos = position % total;
      let loopAcc = 0;
      for (let i = 0; i < items.length; i++) {
        const duration = Number(items[i].duration || 0);
        if (loopPos >= loopAcc && loopPos < loopAcc + duration) {
          return { item: items[i], index: i, offset: loopPos - loopAcc, duration, next: items[(i + 1) % items.length], day };
        }
        loopAcc += duration;
      }
    }
  }

  if (endConfigured && current >= endConfigured) return { offair: true, reason: "A emissão de hoje já terminou." };
  return { offair: true, reason: "Sem programação neste momento." };
}

function getLegacyLoopSlot(now = new Date()) {
  const items = schedule?.items || [];
  const total = totalDuration(items);
  if (!items.length || total <= 0) return null;
  const anchor = new Date(schedule.anchorStart || schedule.updatedAt || Date.now());
  const elapsed = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / 1000));
  const position = elapsed % total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const duration = Number(items[i].duration || 0);
    if (position >= acc && position < acc + duration) return { item: items[i], index: i, offset: position - acc, duration, next: items[(i + 1) % items.length] };
    acc += duration;
  }
  return null;
}

function getCurrentSlot(now = new Date()) {
  const daySlot = getCurrentDaySlot(now);
  if (daySlot) return daySlot;
  return getLegacyLoopSlot(now);
}

function showOffAir(message) {
  const cfg = settings?.offAir || {};
  offair.style.backgroundImage = cfg.imageUrl ? `url('${cfg.imageUrl}')` : "none";
  offairTitle.textContent = cfg.title || settings?.channelName || "KoriTV";
  offairMessage.textContent = message || cfg.message || "A emissão regressa em breve.";
  offair.classList.add("visible");
  video.pause();
  liveBadge.textContent = "OFF AIR";
  nowTitle.textContent = "Fora do ar";
  nowMeta.textContent = "";
  nextMeta.textContent = "";
  progressFill.style.width = "0%";
}

async function showLiveSlot(slot, force = false) {
  if (!slot || slot.offair) return showOffAir(slot?.reason);
  const item = slot.item;
  if (["gap", "offair"].includes(item.type) || !item.url) return showOffAir(item.title || "Espaço vazio na grelha");

  offair.classList.remove("visible");
  liveBadge.textContent = item.type === "age-warning" ? `AVISO ${ratingLabel(item.rating || "A")}` : "● AO VIVO";

  const key = `${item.id || item.title}-${slot.index}`;
  const shouldReload = force || currentKey !== key || video.src !== item.url;

  nowTitle.textContent = item.title || "Sem título";
  nowMeta.textContent = `${(item.type || "bloco").toUpperCase()}${item.rating ? ` · ${ratingLabel(item.rating)}` : ""} · ${Math.floor(slot.offset)}s / ${item.duration}s`;
  nextMeta.textContent = slot.next ? `A seguir: ${slot.next.title}` : "";
  progressFill.style.width = `${Math.min(100, (slot.offset / Math.max(1, slot.duration)) * 100)}%`;

  if (shouldReload) {
    currentKey = key;
    video.src = item.url;
    video.load();
    video.addEventListener("loadedmetadata", () => {
      const safeOffset = Math.min(slot.offset, Math.max(0, video.duration - 0.5));
      video.currentTime = safeOffset;
      video.play().catch(() => {});
    }, { once: true });
  } else if (Math.abs(video.currentTime - slot.offset) > 4) {
    video.currentTime = Math.min(slot.offset, Math.max(0, video.duration - 0.5));
  }
}

async function loadAll(force = false) {
  const [settingsRes, scheduleRes] = await Promise.all([
    fetch(`data/settings.json?t=${Date.now()}`),
    fetch(`data/schedule.json?t=${Date.now()}`)
  ]);
  settings = await settingsRes.json();
  const newSchedule = await scheduleRes.json();
  if (settings.logoUrl) logo.src = settings.logoUrl;
  const versionKey = `${newSchedule.version}-${settings.version}`;
  if (!force && lastVersionKey === versionKey) return;
  schedule = newSchedule;
  lastVersionKey = versionKey;
  applyCurrent(true);
}

function applyCurrent(force = false) {
  const now = new Date();
  if (!isWithinBroadcastHours(now, settings)) return showOffAir();
  const slot = getCurrentSlot(now);
  if (!slot) return showOffAir("Sem programação configurada para agora.");
  showLiveSlot(slot, force);
}

video.addEventListener("ended", () => applyCurrent(true));
setInterval(() => applyCurrent(false), 1000);
loadAll(true).catch(console.error);
setInterval(() => loadAll(false).catch(console.error), Number(settings?.scheduleCheckSeconds || 10) * 1000);
