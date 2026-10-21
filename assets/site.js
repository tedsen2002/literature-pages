const SEARCH_SYNONYMS = [{"zh": ["肝癌", "肝細胞癌"], "en": ["HCC", "hepatocellular"]}, {"zh": ["胰臟癌", "胰腺癌"], "en": ["pancreatic", "pancreas"]}, {"zh": ["直腸癌"], "en": ["rectal", "rectum"]}, {"zh": ["肺癌"], "en": ["lung cancer", "NSCLC", "SCLC"]}, {"zh": ["前列腺", "攝護腺"], "en": ["prostate"]}, {"zh": ["乳癌"], "en": ["breast cancer"]}, {"zh": ["腦轉移"], "en": ["brain metastases", "brain metastasis", "brain metastatic"]}, {"zh": ["腦瘤", "膠質瘤", "膠質母細胞瘤"], "en": ["glioma", "glioblastoma", "brain tumor", "brain tumour", "ependymoma"]}, {"zh": ["寡轉移"], "en": ["oligometastatic", "oligometastasis", "oligometastases", "oligoprogressive", "oligoprogression"]}, {"zh": ["骨轉移"], "en": ["bone metastases", "bone metastasis", "spine metastases", "spinal metastases"]}, {"zh": ["放射手術"], "en": ["radiosurgery", "SRS"]}, {"zh": ["立體定位"], "en": ["SBRT", "SABR", "stereotactic"]}, {"zh": ["質子"], "en": ["proton"]}, {"zh": ["低分次", "大分割"], "en": ["hypofractionation", "hypofractionated"]}, {"zh": ["超低分次", "超大分割"], "en": ["ultrahypofractionation", "ultra-hypofractionation", "ultrahypofractionated", "ultra-hypofractionated"]}, {"zh": ["全腦"], "en": ["WBRT", "whole brain", "whole-brain"]}, {"zh": ["同步化", "化放療", "化學放射"], "en": ["chemoradiotherapy", "chemoradiation"]}, {"zh": ["全程前導", "全程新輔助"], "en": ["TNT", "total neoadjuvant"]}, {"zh": ["荷爾蒙", "雄性素"], "en": ["ADT", "androgen deprivation"]}, {"zh": ["免疫治療"], "en": ["immunotherapy", "immune checkpoint", "PD-1", "PD-L1"]}, {"zh": ["器官保留", "觀察等待"], "en": ["organ preservation", "watch-and-wait", "watch and wait"]}, {"zh": ["加強照射", "追加劑量"], "en": ["boost"]}, {"zh": ["部分乳房"], "en": ["partial breast", "PBI", "APBI"]}, {"zh": ["近接"], "en": ["brachytherapy"]}, {"zh": ["再照射", "再次放療"], "en": ["re-irradiation", "reirradiation"]}, {"zh": ["生活品質"], "en": ["quality of life", "QoL"]}, {"zh": ["統合分析"], "en": ["meta-analysis", "meta analysis"]}];

const queryParams = new URLSearchParams(window.location.search);
const FILTER_PARAMS = [
  ["q", ".filter-search"],
  ["cancer", ".filter-cancer"],
  ["theme", ".filter-theme"],
  ["priority", ".filter-priority"],
  ["study", ".filter-study"],
  ["sort", ".filter-sort"],
];

function controlValue(root, selector) {
  const control = root.querySelector(selector);
  return control ? control.value : "";
}

function controlChecked(root, selector) {
  const control = root.querySelector(selector);
  return Boolean(control && control.checked);
}

function queryValue(...keys) {
  for (const key of keys) {
    const value = queryParams.get(key);
    if (value) return value;
  }
  return "";
}

function setControlValue(root, selector, value) {
  if (!value) return;
  const control = root.querySelector(selector);
  if (!control) return;
  if (control.tagName === "SELECT") {
    const option = Array.from(control.options).find((item) => item.value === value);
    if (option) control.value = value;
    return;
  }
  control.value = value;
}

function applyInitialQueryParams(root) {
  setControlValue(root, ".filter-search", queryValue("q", "search"));
  setControlValue(root, ".filter-cancer", queryValue("cancer", "topic_cancer"));
  setControlValue(root, ".filter-theme", queryValue("theme", "topic_theme"));
  setControlValue(root, ".filter-priority", queryValue("priority"));
  setControlValue(root, ".filter-study", queryValue("study"));
  setControlValue(root, ".filter-sort", queryValue("sort"));
  const manual = root.querySelector(".filter-manual");
  if (manual && queryValue("manual") === "1") manual.checked = true;
}

function searchTokens(root) {
  return (controlValue(root, ".filter-search") || "")
    .toLowerCase()
    .replace(/https?:\/\/(dx\.)?doi\.org\//g, " ")
    .replace(/\b(pmid|doi)\s*:/g, " ")
    .split(/[\s、，,；;]+/)
    .map((token) => token.replace(/[.,;]+$/, ""))
    .filter((token) => token && token !== "pmid" && token !== "doi");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchAlternatives(token) {
  const hits = SEARCH_SYNONYMS.map((group) => ({
    group,
    term: group.zh.find((term) => token.includes(term))
      || (group.en.some((term) => term.toLowerCase() === token) ? token : ""),
  })).filter((hit) => hit.term);
  // 「超低分次」 also contains 「低分次」: keep only the most specific Chinese match.
  const kept = hits.filter((hit) => !hits.some((other) => other.term.length > hit.term.length && other.term.includes(hit.term)));
  const alternatives = [token];
  kept.forEach(({ group }) => [...group.zh, ...group.en].forEach((term) => {
    const lower = term.toLowerCase();
    if (!alternatives.includes(lower)) alternatives.push(lower);
  }));
  return alternatives;
}

function tokenMatches(item, token) {
  return searchAlternatives(token).some((term) => termMatches(item, term));
}

function termMatches(item, token) {
  const pmids = item.dataset.pmids !== undefined ? item.dataset.pmids : item.dataset.pmid;
  if (/^\d{6,9}$/.test(token) && pmids !== undefined) return pmids.split(" ").includes(token);
  if (/^10\.\d{4,9}\//.test(token) && item.dataset.doi !== undefined) return item.dataset.doi === token;
  const haystack = item.dataset.search || "";
  if (/^[a-z0-9]{1,3}$/.test(token) || /^\d+$/.test(token)) {
    return new RegExp("(^|[^a-z0-9])" + escapeRegExp(token) + "($|[^a-z0-9])").test(haystack);
  }
  return haystack.includes(token);
}

function itemMatches(item, root) {
  const tokens = searchTokens(root);
  const cancer = controlValue(root, ".filter-cancer");
  const theme = controlValue(root, ".filter-theme");
  const priority = controlValue(root, ".filter-priority");
  const study = controlValue(root, ".filter-study");
  const manualOnly = controlChecked(root, ".filter-manual");
  const nestedSelector = root.dataset.nestedItems;
  const nestedMatch = () => Boolean(nestedSelector) && tokens.length > 0
    && Array.from(item.querySelectorAll(nestedSelector)).some((card) => tokens.every((token) => tokenMatches(card, token)));
  if (!tokens.every((token) => tokenMatches(item, token)) && !nestedMatch()) return false;
  if (cancer && item.dataset.cancer !== cancer) return false;
  if (theme && item.dataset.theme !== theme) return false;
  if (priority && item.dataset.priority !== priority) return false;
  if (study && item.dataset.study !== study) return false;
  if (manualOnly && item.dataset.manual !== "1") return false;
  return true;
}

function compareItems(mode) {
  return (left, right) => {
    let diff = 0;
    if (mode === "published") diff = (right.dataset.published || "").localeCompare(left.dataset.published || "");
    if (mode === "added") diff = (right.dataset.added || "").localeCompare(left.dataset.added || "");
    if (mode === "priority") diff = (left.dataset.rank || "9").localeCompare(right.dataset.rank || "9");
    return diff || Number(left.dataset.order) - Number(right.dataset.order);
  };
}

function sortFilterItems(root, items) {
  if (!root.querySelector(".filter-sort")) return;
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.parentElement)) groups.set(item.parentElement, []);
    groups.get(item.parentElement).push(item);
  });
  const mode = controlValue(root, ".filter-sort");
  groups.forEach((children, parent) => {
    children.sort(compareItems(mode)).forEach((child) => parent.appendChild(child));
  });
}

function updateFilterSections(target) {
  target.querySelectorAll(".filter-section").forEach((section) => {
    const visibleChildren = section.querySelectorAll(".filter-item:not(.hidden)").length;
    section.classList.toggle("hidden", visibleChildren === 0);
  });
}

function updateNestedMatches(root, items) {
  const nestedSelector = root.dataset.nestedItems;
  if (!nestedSelector) return;
  const tokens = searchTokens(root);
  items.forEach((item) => {
    let hits = 0;
    item.querySelectorAll(nestedSelector).forEach((card) => {
      const hit = tokens.length > 0 && tokens.every((token) => tokenMatches(card, token));
      card.classList.toggle("search-hit", hit);
      if (hit) hits += 1;
    });
    item.querySelectorAll("details.topic-article-block").forEach((block) => {
      if (block.querySelector(".search-hit")) {
        if (!block.open) block.dataset.autoOpened = "1";
        block.open = true;
      } else if (block.dataset.autoOpened === "1") {
        block.open = false;
        delete block.dataset.autoOpened;
      }
    });
    const note = item.querySelector(".topic-hit-note");
    if (note) {
      note.textContent = hits ? "本主題 " + hits + " 篇符合" : "";
      note.classList.toggle("hidden", hits === 0);
    }
  });
}

function updateToggleLabel(root) {
  const toggle = document.querySelector('.filter-toggle[aria-controls="' + root.id + '"]');
  if (!toggle) return;
  const active = FILTER_PARAMS.filter(([, selector]) => (controlValue(root, selector) || "").trim()).length
    + (controlChecked(root, ".filter-manual") ? 1 : 0);
  toggle.textContent = active ? "篩選與排序（已套用 " + active + " 項）" : "篩選與排序";
}

function syncQueryString(root) {
  const params = new URLSearchParams(window.location.search);
  ["search", "topic_cancer", "topic_theme"].forEach((key) => params.delete(key));
  FILTER_PARAMS.forEach(([key, selector]) => {
    const value = (controlValue(root, selector) || "").trim();
    if (value) params.set(key, value);
    else params.delete(key);
  });
  if (root.querySelector(".filter-manual")) {
    if (controlChecked(root, ".filter-manual")) params.set("manual", "1");
    else params.delete("manual");
  }
  const query = params.toString();
  history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
}

function applyFilterRoot(root) {
  const target = document.querySelector(root.dataset.filterTarget);
  if (!target) return;
  const itemSelector = root.dataset.filterItems || ".filter-item";
  const items = Array.from(target.querySelectorAll(itemSelector));
  sortFilterItems(root, items);
  let count = 0;
  items.forEach((item) => {
    const visible = itemMatches(item, root);
    item.classList.toggle("hidden", !visible);
    if (visible) count += 1;
  });
  updateFilterSections(target);
  updateNestedMatches(root, items);
  updateToggleLabel(root);
  const visibleCount = document.getElementById("visibleCount");
  const emptyState = document.getElementById("emptyState");
  if (visibleCount) visibleCount.textContent = String(count);
  if (emptyState) emptyState.classList.toggle("hidden", count !== 0);
}

function clearFiltersHiding(target) {
  const hiddenItem = target.closest(".filter-item.hidden");
  if (!hiddenItem) return;
  document.querySelectorAll(".filter-panel").forEach((root) => {
    const owner = document.querySelector(root.dataset.filterTarget);
    if (!owner || !owner.contains(hiddenItem)) return;
    root.querySelectorAll("input, select").forEach((control) => {
      if (control.classList.contains("filter-sort")) return;
      if (control.type === "checkbox") control.checked = false;
      else control.value = "";
    });
    applyFilterRoot(root);
    syncQueryString(root);
  });
}

function revealTarget(id) {
  const target = id ? document.getElementById(id) : null;
  if (!target || !target.matches(".article-card, .topic-card, .related-item")) return false;
  clearFiltersHiding(target);
  for (let node = target; node; node = node.parentElement) {
    if (node.tagName === "DETAILS") node.open = true;
  }
  document.querySelectorAll(".is-targeted").forEach((node) => node.classList.remove("is-targeted"));
  target.classList.add("is-targeted");
  target.scrollIntoView({ block: "start" });
  return true;
}

document.querySelectorAll(".filter-panel").forEach((root) => {
  const target = document.querySelector(root.dataset.filterTarget);
  if (target) {
    Array.from(target.querySelectorAll(root.dataset.filterItems || ".filter-item")).forEach((item, index) => {
      item.dataset.order = String(index);
    });
  }
  applyInitialQueryParams(root);
  root.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", () => {
      applyFilterRoot(root);
      syncQueryString(root);
    });
  });
  applyFilterRoot(root);
});

document.querySelectorAll(".filter-toggle").forEach((toggle) => {
  const panel = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!panel) return;
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
  });
});

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[data-reveal]");
  if (!link) return;
  const id = decodeURIComponent((link.getAttribute("href") || "").slice(1));
  if (!revealTarget(id)) return;
  event.preventDefault();
  history.replaceState(null, "", "#" + encodeURIComponent(id));
});

window.addEventListener("hashchange", () => revealTarget(decodeURIComponent(window.location.hash.slice(1))));
if (window.location.hash) revealTarget(decodeURIComponent(window.location.hash.slice(1)));
