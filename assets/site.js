
const controls = {
  search: document.getElementById("searchBox"),
  cancer: document.getElementById("cancerFilter"),
  priority: document.getElementById("priorityFilter"),
  study: document.getElementById("studyFilter"),
};
const articles = Array.from(document.querySelectorAll("#allArticles .article-card"));
const visibleCount = document.getElementById("visibleCount");
const emptyState = document.getElementById("emptyState");

function matches(article) {
  const query = (controls.search.value || "").trim().toLowerCase();
  const cancer = controls.cancer.value;
  const priority = controls.priority.value;
  const study = controls.study.value;
  if (query && !article.dataset.search.includes(query)) return false;
  if (cancer && article.dataset.cancer !== cancer) return false;
  if (priority && article.dataset.priority !== priority) return false;
  if (study && article.dataset.study !== study) return false;
  return true;
}

function applyFilters() {
  let count = 0;
  articles.forEach((article) => {
    const visible = matches(article);
    article.classList.toggle("hidden", !visible);
    if (visible) count += 1;
  });
  visibleCount.textContent = String(count);
  emptyState.classList.toggle("hidden", count !== 0);
}

Object.values(controls).forEach((control) => {
  if (control) control.addEventListener("input", applyFilters);
});
applyFilters();
