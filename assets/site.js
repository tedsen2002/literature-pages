
function controlValue(root, selector) {
  const control = root.querySelector(selector);
  return control ? control.value : "";
}

function itemMatches(item, root) {
  const query = (controlValue(root, ".filter-search") || "").trim().toLowerCase();
  const cancer = controlValue(root, ".filter-cancer");
  const theme = controlValue(root, ".filter-theme");
  const priority = controlValue(root, ".filter-priority");
  const study = controlValue(root, ".filter-study");
  if (query && !(item.dataset.search || "").includes(query)) return false;
  if (cancer && item.dataset.cancer !== cancer) return false;
  if (theme && item.dataset.theme !== theme) return false;
  if (priority && item.dataset.priority !== priority) return false;
  if (study && item.dataset.study !== study) return false;
  return true;
}

function updateFilterSections(target) {
  target.querySelectorAll(".filter-section").forEach((section) => {
    const visibleChildren = section.querySelectorAll(".filter-item:not(.hidden)").length;
    section.classList.toggle("hidden", visibleChildren === 0);
  });
}

function applyFilterRoot(root) {
  const target = document.querySelector(root.dataset.filterTarget);
  if (!target) return;
  const items = Array.from(target.querySelectorAll(".filter-item"));
  let count = 0;
  items.forEach((item) => {
    const visible = itemMatches(item, root);
    item.classList.toggle("hidden", !visible);
    if (visible) count += 1;
  });
  updateFilterSections(target);
  const visibleCount = document.getElementById("visibleCount");
  const emptyState = document.getElementById("emptyState");
  if (visibleCount) visibleCount.textContent = String(count);
  if (emptyState) emptyState.classList.toggle("hidden", count !== 0);
}

document.querySelectorAll(".filter-panel").forEach((root) => {
  root.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", () => applyFilterRoot(root));
  });
  applyFilterRoot(root);
});
