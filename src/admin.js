let state = { schedule: null, library: null, settings: null, selectedIndex: null };

const els = {
  nowBox: document.getElementById("nowBox"), assetList: document.getElementById("assetList"), scheduleList: document.getElementById("scheduleList"),
  assetSelect: document.getElementById("assetSelect"), typeInput: document.getElementById("typeInput"), titleInput: document.getElementById("titleInput"),
  urlInput: document.getElementById("urlInput"), durationInput: document.getElementById("durationInput"), ratingInput: document.getElementById("ratingInput"), posterInput: document.getElementById("posterInput"),
  channelMode: document.getElementById("channelMode"), broadcastStart: document.getElementById("broadcastStart"), broadcastEnd: document.getElementById("broadcastEnd"),
  logoUrl: document.getElementById("logoUrl"), offairImage: document.getElementById("offairImage"), offairMessage: document.getElementById("offairMessage"), status: document.getElementById("status"),
  previewVideo: document.getElementById("previewVideo"), dayDate: document.getElementById("dayDate"), dayStart: document.getElementById("dayStart"), dayEnd: document.getElementById("dayEnd"),
  insertMode: document.getElementById("insertMode"), insertTime: document.getElementById("insertTime"), scheduleRating: document.getElementById("scheduleRating"),
  autoIdent: document.getElementById("autoIdent"), autoAgeWarning: document.getElementById("autoAgeWarning"), daySummary: document.getElementById("daySummary"), validationBox: document.getElementById("validationBox"),
  defaultIdentId: document.getElementById("defaultIdentId"), defaultSeparatorId: document.getElementById("defaultSeparatorId"),
  warnA: document.getElementById("warnA"), warn7: document.getElementById("warn7"), warn12: document.getElementById("warn12"), warn15: document.getElementById("warn15"), warn19: document.getElementById("warn19")
};

function uid(prefix) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`; }
function todayISO(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
function secToClock(total) { total = Math.max(0, Math.floor(total)); const h = Math.floor(total / 3600) % 24; const m = Math.floor((total % 3600) / 60); const s = total % 60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
function timeToSec(v) { if (!v) return 0; const [h,m,s=0] = v.split(":").map(Number); return (h || 0) * 3600 + (m || 0) * 60 + (s || 0); }
function totalDuration(items) { return (items || []).reduce((s, item) => s + Number(item.duration || 0), 0); }
function ratingLabel(r) { return r === "A" ? "A · Todos os públicos" : `+${r}`; }
function currentDay() { return ensureDay(els.dayDate.value || todayISO()); }
function dayStartSec(day = currentDay()) { return timeToSec(day.startTime || "10:00"); }
function itemStartSec(items, index, startSec) { return startSec + totalDuration(items.slice(0, index)); }
function itemEndSec(items, index, startSec) { return itemStartSec(items, index, startSec) + Number(items[index]?.duration || 0); }

function ensureDay(date) {
  state.schedule.days = state.schedule.days || [];
  let day = state.schedule.days.find(d => d.date === date);
  if (!day) {
    day = { date, startTime: els.dayStart.value || state.settings.broadcastStart || "10:00", endTime: els.dayEnd.value || state.settings.broadcastEnd || "00:00", items: [] };
    state.schedule.days.push(day);
  }
  return day;
}

function assertDateAllowed(date) {
  const min = todayISO(0); const max = todayISO(7);
  if (date < min || date > max) throw new Error(`Só podes programar de ${min} até ${max}.`);
}

function makeSlotFromAsset(asset, forced = {}) {
  const rating = forced.rating || asset.rating || "A";
  return { id: uid("slot"), assetId: asset.id, type: asset.type, title: asset.title, url: asset.url, duration: Number(asset.duration || 10), rating: asset.type === "program" ? rating : undefined, poster: asset.poster || "" };
}

function makeGap(duration, title = "Espaço vazio") {
  return { id: uid("gap"), type: "gap", title, url: "", duration: Math.max(1, Number(duration || 60)) };
}

function makeOffAirSlot(title = "Fecho de emissão") {
  return { id: uid("offair"), type: "offair", title, url: "", duration: 60 };
}

function makeAgeWarning(rating) {
  const warning = state.settings.ageWarnings?.[rating];
  if (!warning?.url) return null;
  return { id: uid("age"), type: "age-warning", title: warning.title || `Aviso ${ratingLabel(rating)}`, url: warning.url, duration: Number(warning.duration || 5), rating };
}

function defaultIdentSlot() {
  const id = state.settings.defaultIdentId;
  const asset = state.library.assets.find(a => a.id === id) || state.library.assets.find(a => a.type === "ident");
  return asset ? makeSlotFromAsset(asset) : null;
}

function buildBlocksForAsset(asset, rating) {
  const blocks = [];
  if (els.autoIdent.checked && asset.type === "program") {
    const ident = defaultIdentSlot();
    if (ident) blocks.push(ident);
  }
  const finalRating = rating === "asset" ? (asset.rating || "A") : rating;
  if (els.autoAgeWarning.checked && asset.type === "program") {
    const warning = makeAgeWarning(finalRating);
    if (warning) blocks.push(warning);
  }
  blocks.push(makeSlotFromAsset(asset, { rating: finalRating }));
  return blocks;
}

async function loadData() {
  const res = await fetch("/api/data");
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  state.schedule = data.schedule; state.library = data.library; state.settings = data.settings;
  setupDateControls(); render();
}

function setupDateControls() {
  els.dayDate.min = todayISO(0); els.dayDate.max = todayISO(7);
  if (!els.dayDate.value) els.dayDate.value = todayISO(0);
  const day = ensureDay(els.dayDate.value);
  els.dayStart.value = day.startTime || state.settings.broadcastStart || "10:00";
  els.dayEnd.value = day.endTime || state.settings.broadcastEnd || "00:00";
  els.insertTime.value = els.dayStart.value;
}

function render() { renderSettings(); renderAssetDropdowns(); renderAssets(); renderSchedule(); renderNow(); validateAndShow(false); }

function renderSettings() {
  els.channelMode.value = state.settings.channelMode || "scheduled";
  els.broadcastStart.value = state.settings.broadcastStart || "10:00";
  els.broadcastEnd.value = state.settings.broadcastEnd || "00:00";
  els.logoUrl.value = state.settings.logoUrl || "";
  els.offairImage.value = state.settings.offAir?.imageUrl || "";
  els.offairMessage.value = state.settings.offAir?.message || "";
  const w = state.settings.ageWarnings || {};
  els.warnA.value = w.A?.url || ""; els.warn7.value = w[7]?.url || ""; els.warn12.value = w[12]?.url || ""; els.warn15.value = w[15]?.url || ""; els.warn19.value = w[19]?.url || "";
}

function renderAssetDropdowns() {
  const assets = state.library.assets || [];
  els.assetSelect.innerHTML = assets.map(a => `<option value="${a.id}">${a.title} · ${a.type}${a.rating ? ` · ${a.rating}` : ""}</option>`).join("");
  const identOptions = assets.filter(a => a.type === "ident").map(a => `<option value="${a.id}">${a.title}</option>`).join("");
  const sepOptions = assets.filter(a => a.type === "separator").map(a => `<option value="${a.id}">${a.title}</option>`).join("");
  els.defaultIdentId.innerHTML = `<option value="">Sem ident padrão</option>${identOptions}`;
  els.defaultSeparatorId.innerHTML = `<option value="">Sem separador padrão</option>${sepOptions}`;
  els.defaultIdentId.value = state.settings.defaultIdentId || "";
  els.defaultSeparatorId.value = state.settings.defaultSeparatorId || "";
}

function renderAssets() {
  const assets = state.library.assets || [];
  els.assetList.innerHTML = assets.map((asset) => `
    <div class="asset">
      <div class="slot-top"><strong>${asset.title}</strong><span class="pill">${asset.type}</span></div>
      <div class="muted small">${asset.duration}s${asset.rating ? ` · ${ratingLabel(asset.rating)}` : ""}</div>
      <div class="muted small truncate">${asset.url}</div>
      <div class="row">
        <button class="btn-ghost" onclick="quickAddAsset('${asset.id}')">A seguir</button>
        <button class="btn-ghost" onclick="previewUrl('${asset.url}')">Preview</button>
        <button class="btn-danger" onclick="deleteAsset('${asset.id}')">Apagar</button>
      </div>
    </div>`).join("");
}

function renderSchedule() {
  const day = currentDay(); day.startTime = els.dayStart.value || day.startTime; day.endTime = els.dayEnd.value || day.endTime;
  const items = day.items || []; const start = dayStartSec(day);
  const total = totalDuration(items); const end = start + total;
  els.daySummary.textContent = `${day.date} · começa ${day.startTime} · termina ${secToClock(end)} · ${items.length} blocos · ${Math.round(total/60)} min`;
  els.scheduleList.innerHTML = items.map((item, index) => {
    const s = itemStartSec(items, index, start); const e = s + Number(item.duration || 0); const selected = state.selectedIndex === index ? "selected" : "";
    const gapTools = item.type === "gap" ? `<button class="btn-ghost" onclick="pullGapUp(${index})">Puxar</button><button class="btn-ghost" onclick="replaceGap(${index})">Inserir aqui</button>` : "";
    return `<div class="slot ${selected} type-${item.type}" draggable="true" ondragstart="dragStart(event, ${index})" ondragover="dragOver(event)" ondrop="dropSlot(event, ${index})" onclick="selectSlot(${index})">
      <div class="slot-time"><strong>${secToClock(s)} → ${secToClock(e)}</strong><span class="pill">${item.type}</span></div>
      <div class="slot-top"><div><strong>${index + 1}. ${item.title}</strong><div class="muted small">${item.duration}s${item.rating ? ` · ${ratingLabel(item.rating)}` : ""}</div><div class="muted small truncate">${item.url || "sem vídeo / ecrã de espera"}</div></div></div>
      <div class="row">
        <button class="btn-ghost" onclick="event.stopPropagation(); moveSlot(${index}, -1)">↑</button>
        <button class="btn-ghost" onclick="event.stopPropagation(); moveSlot(${index}, 1)">↓</button>
        <button class="btn-ghost" onclick="event.stopPropagation(); duplicateSlot(${index})">Duplicar</button>
        <button class="btn-ghost" onclick="event.stopPropagation(); previewSlot(${index})">Preview</button>
        ${gapTools}
        <button class="btn-danger" onclick="event.stopPropagation(); removeSlot(${index})">Remover</button>
      </div>
    </div>`;
  }).join("") || `<div class="empty-state">Este dia ainda não tem emissão. Adiciona um ident/programa ou cria espaço vazio.</div>`;
}

function renderNow() {
  const slot = getCurrentSlot();
  if (!slot) { els.nowBox.textContent = "Neste momento não há bloco ativo."; return; }
  els.nowBox.innerHTML = `<strong>${slot.item.title}</strong><br><span class="muted">${slot.item.type.toUpperCase()} · ${Math.floor(slot.offset / 60)}:${String(slot.offset % 60).padStart(2, "0")}</span><br><span class="muted">A seguir: ${slot.next?.title || "off-air"}</span>`;
}

function getCurrentSlot(now = new Date()) {
  const date = now.toISOString().slice(0,10); const day = (state.schedule.days || []).find(d => d.date === date);
  if (!day) return null; const items = day.items || []; if (!items.length) return null;
  const current = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds(); const start = timeToSec(day.startTime || "00:00"); const pos = current - start;
  if (pos < 0) return null;
  let acc = 0; for (let i=0; i<items.length; i++) { const d = Number(items[i].duration || 0); if (pos >= acc && pos < acc+d) return { item: items[i], index: i, offset: pos-acc, next: items[i+1] }; acc += d; }
  return null;
}

function loadOrCreateDay() { try { assertDateAllowed(els.dayDate.value); const day = ensureDay(els.dayDate.value); day.startTime = els.dayStart.value || day.startTime; day.endTime = els.dayEnd.value || day.endTime; renderSchedule(); validateAndShow(false); } catch (e) { alert(e.message); } }
function setDayStartNow() { const now = new Date(); els.dayDate.value = todayISO(0); els.dayStart.value = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`; loadOrCreateDay(); }

function addCustomAsset() {
  const asset = { id: uid("asset"), type: els.typeInput.value, title: els.titleInput.value.trim() || "Novo bloco", url: els.urlInput.value.trim(), duration: Number(els.durationInput.value || 10), poster: els.posterInput.value.trim() };
  if (asset.type === "program") asset.rating = els.ratingInput.value || "A";
  if (!asset.url) return alert("Mete o URL do vídeo/imagem primeiro.");
  state.library.assets.push(asset); renderAssetDropdowns(); renderAssets(); els.titleInput.value = ""; els.urlInput.value = ""; els.posterInput.value = "";
}

function deleteAsset(id) { if (!confirm("Apagar este asset da biblioteca? A grelha não é apagada.")) return; state.library.assets = state.library.assets.filter(a => a.id !== id); render(); }
function quickAddAsset(id) { els.assetSelect.value = id; els.insertMode.value = "next"; addSelectedAssetAdvanced(); }

function addSelectedAssetAdvanced() {
  const day = currentDay(); const asset = state.library.assets.find(a => a.id === els.assetSelect.value); if (!asset) return;
  const blocks = buildBlocksForAsset(asset, els.scheduleRating.value);
  const items = day.items;
  if (els.insertMode.value === "selected" && state.selectedIndex !== null) items.splice(state.selectedIndex + 1, 0, ...blocks);
  else if (els.insertMode.value === "time") insertBlocksAtTime(day, blocks, els.insertTime.value);
  else items.push(...blocks);
  render();
}

function insertBlocksAtTime(day, blocks, time) {
  const target = timeToSec(time); const start = timeToSec(day.startTime || "00:00"); const rel = target - start;
  if (rel < 0) return alert("Essa hora é antes do início do dia.");
  const items = day.items; let acc = 0;
  for (let i=0; i<items.length; i++) {
    const d = Number(items[i].duration || 0);
    if (rel === acc) { items.splice(i, 0, ...blocks); return; }
    if (rel > acc && rel < acc+d) {
      if (items[i].type === "gap") {
        const before = rel - acc; const after = d - before; const repl = []; if (before > 0) repl.push(makeGap(before)); repl.push(...blocks); if (after > 0) repl.push(makeGap(after)); items.splice(i, 1, ...repl); return;
      }
      if (!confirm("Essa hora cai no meio de outro bloco. Queres inserir aqui e empurrar tudo para a frente?")) return;
      items.splice(i+1, 0, ...blocks); return;
    }
    acc += d;
  }
  if (rel > acc) items.push(makeGap(rel - acc, "Espaço vazio até à hora escolhida"));
  items.push(...blocks);
}

function insertGapAtEnd() { const min = Number(prompt("Quantos minutos de espaço vazio?", "10") || 0); if (min > 0) { currentDay().items.push(makeGap(min*60)); render(); } }
function pullGapUp(index) { const items = currentDay().items; if (items[index]?.type === "gap") { items.splice(index,1); render(); } }
function pullAllGapsUp() { if (!confirm("Remover todos os espaços vazios deste dia e puxar a emissão para cima?")) return; currentDay().items = currentDay().items.filter(i => i.type !== "gap"); render(); }
function replaceGap(index) { state.selectedIndex = index - 1; els.insertMode.value = "selected"; alert("Escolhe um asset e carrega em Adicionar. Ele entra neste espaço/posição."); renderSchedule(); }
function closeDayHere() { currentDay().items.push(makeOffAirSlot()); render(); }

function selectSlot(index) { state.selectedIndex = index; renderSchedule(); }
function moveSlot(index, dir) { const items = currentDay().items; const target = index + dir; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; state.selectedIndex = target; render(); }
function removeSlot(index) { currentDay().items.splice(index, 1); state.selectedIndex = null; render(); }
function duplicateSlot(index) { const item = JSON.parse(JSON.stringify(currentDay().items[index])); item.id = uid("slot"); currentDay().items.splice(index+1, 0, item); render(); }
function previewUrl(url) { if (!url) return; els.previewVideo.src = url; els.previewVideo.play().catch(()=>{}); }
function previewSlot(index) { previewUrl(currentDay().items[index]?.url); }

let dragIndex = null;
function dragStart(event, index) { dragIndex = index; event.dataTransfer.effectAllowed = "move"; }
function dragOver(event) { event.preventDefault(); }
function dropSlot(event, target) { event.preventDefault(); const items = currentDay().items; if (dragIndex === null || dragIndex === target) return; const [moved] = items.splice(dragIndex,1); items.splice(target,0,moved); dragIndex = null; render(); }

function updateSettingsFromForm() {
  state.settings.channelMode = els.channelMode.value; state.settings.broadcastStart = els.broadcastStart.value; state.settings.broadcastEnd = els.broadcastEnd.value; state.settings.logoUrl = els.logoUrl.value.trim();
  state.settings.defaultIdentId = els.defaultIdentId.value; state.settings.defaultSeparatorId = els.defaultSeparatorId.value;
  state.settings.offAir = state.settings.offAir || {}; state.settings.offAir.imageUrl = els.offairImage.value.trim(); state.settings.offAir.message = els.offairMessage.value;
  state.settings.ageWarnings = state.settings.ageWarnings || {};
  [["A",els.warnA],["7",els.warn7],["12",els.warn12],["15",els.warn15],["19",els.warn19]].forEach(([r,el]) => { state.settings.ageWarnings[r] = state.settings.ageWarnings[r] || {}; state.settings.ageWarnings[r].url = el.value.trim(); state.settings.ageWarnings[r].title = state.settings.ageWarnings[r].title || `Aviso ${ratingLabel(r)}`; state.settings.ageWarnings[r].duration = Number(state.settings.ageWarnings[r].duration || (r === "A" || r === "7" ? 5 : 6)); });
  const day = currentDay(); day.startTime = els.dayStart.value; day.endTime = els.dayEnd.value;
}

function validateSchedule() {
  updateSettingsFromForm(); const day = currentDay(); const items = day.items || []; const warnings = []; const errors = [];
  if (!items.length) warnings.push("Este dia não tem blocos de emissão.");
  items.forEach((item, i) => {
    if (!["gap","offair"].includes(item.type) && !item.url) errors.push(`${i+1}. ${item.title}: bloco sem URL de vídeo.`);
    if (item.duration <= 0) errors.push(`${i+1}. ${item.title}: duração inválida.`);
    if (item.type === "program") {
      if (!item.rating) warnings.push(`${i+1}. ${item.title}: programa sem rating de idade.`);
      const prev = items[i-1]; const prev2 = items[i-2];
      if (!prev || (prev.type !== "ident" && prev2?.type !== "ident")) warnings.push(`${i+1}. ${item.title}: programa sem ident imediatamente antes/na preparação.`);
      if (!prev || prev.type !== "age-warning") warnings.push(`${i+1}. ${item.title}: programa sem vídeo de aviso de idade imediatamente antes.`);
      if (item.rating && !state.settings.ageWarnings?.[item.rating]?.url) warnings.push(`${i+1}. ${item.title}: não há URL configurado para aviso ${item.rating}.`);
    }
  });
  const gaps = items.filter(i => i.type === "gap"); if (gaps.length) warnings.push(`Existem ${gaps.length} espaços vazios na grelha. Podes clicar em “Puxar” para remover.`);
  return { errors, warnings };
}

function validateAndShow(forceAlert = false) {
  const { errors, warnings } = validateSchedule();
  const html = [...errors.map(e => `<div class="issue error">Erro: ${e}</div>`), ...warnings.map(w => `<div class="issue warn">Aviso: ${w}</div>`)].join("");
  els.validationBox.innerHTML = html || `<div class="issue ok">Tudo alinhado. Sem erros importantes.</div>`;
  if (forceAlert) alert(errors.length || warnings.length ? `${errors.length} erros · ${warnings.length} avisos` : "Sem erros/avisos.");
  return { errors, warnings };
}

async function saveLocalOnly() { await save(false); }
async function publishGit() { await save(true); }
async function save(publishToGit) {
  updateSettingsFromForm(); const validation = validateSchedule();
  if (validation.errors.length) return alert("Corrige os erros antes de publicar:\n\n" + validation.errors.join("\n"));
  if (publishToGit && validation.warnings.length && !confirm("Há avisos na grelha. Queres publicar mesmo assim?\n\n" + validation.warnings.join("\n"))) return;
  els.status.textContent = publishToGit ? "A guardar + fazer commit/push..." : "A guardar localmente...";
  const res = await fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule: state.schedule, library: state.library, settings: state.settings, publishToGit }) });
  const result = await res.json();
  if (!result.ok) { els.status.textContent = `Erro:\n${result.error}`; return; }
  els.status.textContent = publishToGit ? `Publicado.\n${result.git?.output || "Commit feito."}` : "Guardado localmente.";
  await loadData();
}

els.dayDate.addEventListener("change", loadOrCreateDay); els.dayStart.addEventListener("change", render); els.dayEnd.addEventListener("change", render);
setInterval(renderNow, 1000);
loadData().catch((err) => { els.status.textContent = err.message; });
