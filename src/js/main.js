import { API } from "./api/mealdb.js";
import { UI } from "./ui/components.js";

class NutriPlanApp {
  constructor() {
    this.storageKey = "nutri_log_v1";
    this.currentProductsList = [];

    // sections
    this.pages = {
      meals: [
        "search-filters-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      products: ["products-section"],
      foodlog: ["foodlog-section"],
      details: ["meal-details"],
    };

    // default daily targets
    this.dailyTargets = { cal: 2000, pro: 50, carb: 250, fat: 65 };

    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupEvents();

    window.addEventListener("hashchange", () => this.route());
    this.route();

    await this.loadInitialData();
    this.hideLoader();
  }

  setupNavigation() {
    this.sidebar = document.getElementById("sidebar");
    this.overlay = document.getElementById("sidebar-overlay");

    document.getElementById("header-menu-btn").onclick = () => {
      this.sidebar.classList.add("open");
      this.overlay.classList.add("active");
    };

    const closeSidebar = () => {
      this.sidebar.classList.remove("open");
      this.overlay.classList.remove("active");
    };

    document.getElementById("sidebar-close-btn").onclick = closeSidebar;
    this.overlay.onclick = closeSidebar;

    document.querySelectorAll(".nav-link").forEach((link, i) => {
      link.onclick = (e) => {
        e.preventDefault();
        const paths = ["meals", "products", "foodlog"];
        window.location.hash = paths[i];
        if (window.innerWidth < 1024) closeSidebar();
      };
    });
  }

  route() {
    const page = window.location.hash.replace("#", "") || "meals";
    this.showPage(page);
  }

  showPage(pageId) {
    Object.values(this.pages)
      .flat()
      .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });

    (this.pages[pageId] || this.pages.meals).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("hidden");
    });

    document.querySelectorAll(".nav-link").forEach((link) => {
      const text = link.innerText.toLowerCase();
      const isActive =
        pageId === "foodlog"
          ? text.includes("food log")
          : text.includes(pageId);

      link.classList.toggle("bg-emerald-50", isActive);
      link.classList.toggle("text-emerald-700", isActive);
    });

    if (pageId === "foodlog") this.renderLog();
  }

  async loadInitialData() {
    const [catData, mealData] = await Promise.all([
      API.getCategories(),
      API.getMeals(""),
    ]);

    this.render(
      "categories-grid",
      catData?.categories || [],
      UI.createCategoryCard,
    );
    this.render("recipes-grid", mealData || [], UI.createRecipeCard);

    const countEl = document.getElementById("recipes-count");
    if (countEl) countEl.textContent = `Showing ${mealData.length} recipes`;
  }

  updateProductsCount(products) {
    const countEl = document.getElementById("products-count");
    if (countEl) {
      countEl.textContent = products.length
        ? `Found ${products.length} products`
        : "No products found";
    }
  }

  setupEvents() {
    // Area/Cuisine filter buttons (All Recipes, Egyptian, etc.)
    const areaFilters = document.querySelector(
      "#search-filters-section .flex.items-center.gap-3",
    );
    if (areaFilters) {
      areaFilters.onclick = async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const grid = document.getElementById("recipes-grid");
        grid.innerHTML = UI.loader;

        // Update button styles
        areaFilters.querySelectorAll("button").forEach((b) => {
          b.classList.remove("bg-emerald-600", "text-white");
          b.classList.add("bg-gray-100", "text-gray-700");
        });
        btn.classList.remove("bg-gray-100", "text-gray-700");
        btn.classList.add("bg-emerald-600", "text-white");

        const filter = btn.textContent.trim();
        let meals = [];

        if (filter === "All Recipes") {
          meals = await API.getMeals("");
        } else {
          // Fix for the "Egyptain" typo in HTML to call the correct "Egyptian" API endpoint
          const areaName =
            filter === "Egyptain" || filter === "Egyptian"
              ? "Egyptian"
              : filter;
          const data = await API.filterByArea(areaName);
          meals = data?.meals || [];
        }

        this.render("recipes-grid", meals, UI.createRecipeCard);
        const countEl = document.getElementById("recipes-count");
        if (countEl) countEl.textContent = `Showing ${meals.length} recipes`;
      };
    }

    // Meals search
    document.getElementById("search-input").oninput = this.debounce(
      async (e) => {
        const grid = document.getElementById("recipes-grid");
        grid.innerHTML = UI.loader;
        const meals = await API.getMeals(e.target.value);
        this.render("recipes-grid", meals, UI.createRecipeCard);
      },
      500,
    );

    // Category filter click (Meals)
    document.getElementById("categories-grid").onclick = async (e) => {
      const card = e.target.closest(".category-card");
      if (!card) return;
      const grid = document.getElementById("recipes-grid");
      grid.innerHTML = UI.loader;
      const data = await API.filterByCategory(card.dataset.category);
      this.render("recipes-grid", data?.meals || [], UI.createRecipeCard);
    };

    // Product search
    document.getElementById("search-product-btn").onclick = async () => {
      const q = document.getElementById("product-search-input").value;
      const grid = document.getElementById("products-grid");
      grid.innerHTML = UI.loader;

      this.currentProductsList = await API.searchProducts(q);
      this.render(
        "products-grid",
        this.currentProductsList,
        UI.createProductCard,
      );
      this.updateProductsCount(this.currentProductsList);
    };

    // Barcode lookup
    document.getElementById("lookup-barcode-btn").onclick = async () => {
      const code = document.getElementById("barcode-input").value;
      const grid = document.getElementById("products-grid");
      grid.innerHTML = UI.loader;

      this.currentProductsList = await API.getProductByBarcode(code);
      this.render(
        "products-grid",
        this.currentProductsList,
        UI.createProductCard,
      );
      this.updateProductsCount(this.currentProductsList);
    };

    // Product category buttons
    document.getElementById("product-categories").onclick = async (e) => {
      const btn = e.target.closest(".product-category-btn");
      if (!btn) return;

      const category = btn.textContent.trim();
      document.getElementById("product-search-input").value = category;

      const grid = document.getElementById("products-grid");
      grid.innerHTML = UI.loader;

      this.currentProductsList = await API.searchProducts(category);
      this.render(
        "products-grid",
        this.currentProductsList,
        UI.createProductCard,
      );
      this.updateProductsCount(this.currentProductsList);
    };

    // Nutri-Score filtering
    document.querySelectorAll(".nutri-score-filter").forEach((btn) => {
      btn.onclick = () => {
        document
          .querySelectorAll(".nutri-score-filter")
          .forEach((b) => b.classList.replace("bg-emerald-600", "bg-gray-100"));
        btn.classList.add("bg-emerald-600", "text-white");

        const grade = btn.dataset.grade;
        if (!grade) {
          this.render(
            "products-grid",
            this.currentProductsList,
            UI.createProductCard,
          );
          this.updateProductsCount(this.currentProductsList);
        } else {
          const filtered = this.currentProductsList.filter(
            (p) =>
              p.nutrition_grades &&
              p.nutrition_grades.toLowerCase() === grade.toLowerCase(),
          );
          this.render("products-grid", filtered, UI.createProductCard);
          this.updateProductsCount(filtered);
        }
      };
    });

    // Global click handler for logging and details
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("log-item-btn")) {
        const d = e.target.dataset;
        this.saveToLog({
          name: d.name,
          cal: parseFloat(d.cal) || 0,
          pro: parseFloat(d.pro) || 0,
          carb: parseFloat(d.carb) || 0,
          fat: parseFloat(d.fat) || 0,
        });
        return;
      }

      const card = e.target.closest(".recipe-card");
      if (card) this.openDetails(card.dataset.id);
    });

    document.getElementById("back-to-meals-btn").onclick = () => {
      window.location.hash = "meals";
    };

    document.getElementById("clear-foodlog").onclick = () => {
      localStorage.removeItem(this.storageKey);
      this.renderLog();
    };
  }

  async openDetails(id) {
    window.location.hash = "details";
    const detailContainer = document.getElementById("meal-details");
    const data = await API.getMealById(id);
    const m = data?.meals?.[0];

    if (!m) return;

    detailContainer.querySelector("h1").textContent = m.strMeal;
    detailContainer.querySelector("img").src = m.strMealThumb;

    detailContainer.querySelector("#log-meal-btn").onclick = () => {
      this.saveToLog({
        name: m.strMeal,
        cal: 450,
        pro: 25,
        carb: 40,
        fat: 12,
      });
    };

    const ingredientsList = [];
    for (let i = 1; i <= 20; i++) {
      const ing = m[`strIngredient${i}`];
      if (!ing) continue;
      ingredientsList.push(`
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <span class="text-gray-700"><span class="font-medium text-gray-900">${m[`strMeasure${i}`]}</span> ${ing}</span>
        </div>`);
    }

    detailContainer.querySelector(".grid-cols-1.md\\:grid-cols-2").innerHTML =
      ingredientsList.join("");
    detailContainer.querySelector(".space-y-4").innerText = m.strInstructions;

    if (m.strYoutube) {
      detailContainer.querySelector("iframe").src = m.strYoutube.replace(
        "watch?v=",
        "embed/",
      );
    }
  }

  saveToLog(item) {
    const log = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    log.push({ ...item, id: Date.now() });
    localStorage.setItem(this.storageKey, JSON.stringify(log));

    Swal.fire({
      title: "Success!",
      text: `${item.name} added to your log.`,
      icon: "success",
      toast: true,
      position: "top-end",
      timer: 3000,
      showConfirmButton: false,
    });

    if (window.location.hash === "#foodlog") this.renderLog();
  }

  renderLog() {
    const log = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    const container = document.getElementById("logged-items-list");
    const clearBtn = document.getElementById("clear-foodlog");

    const totals = log.reduce(
      (acc, item) => {
        acc.cal += item.cal || 0;
        acc.pro += item.pro || 0;
        acc.carb += item.carb || 0;
        acc.fat += item.fat || 0;
        return acc;
      },
      { cal: 0, pro: 0, carb: 0, fat: 0 },
    );

    this.updateProgress(
      "Calories",
      totals.cal,
      this.dailyTargets.cal,
      "emerald",
    );
    this.updateProgress("Protein", totals.pro, this.dailyTargets.pro, "blue");
    this.updateProgress("Carbs", totals.carb, this.dailyTargets.carb, "amber");
    this.updateProgress("Fat", totals.fat, this.dailyTargets.fat, "purple");

    clearBtn.style.display = log.length ? "block" : "none";

    if (!log.length) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
          <p class="font-medium">No meals logged today</p>
        </div>`;
      return;
    }

    container.innerHTML = log
      .map(
        (item) => `
          <div class="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border mb-2">
            <div>
              <p class="font-bold text-gray-900">${item.name}</p>
              <p class="text-[10px] text-gray-500 uppercase">${item.pro}g P | ${item.carb}g C | ${item.fat}g F</p>
            </div>
            <span class="text-emerald-600 font-bold">${Math.round(item.cal)} kcal</span>
          </div>`,
      )
      .reverse()
      .join("");
  }

  updateProgress(label, current, target, color) {
    const cards = document.querySelectorAll(
      `#foodlog-today-section .bg-${color}-50`,
    );
    cards.forEach((card) => {
      if (!card.innerText.includes(label)) return;
      const percent = Math.min((current / target) * 100, 100);
      card.querySelector(".text-sm.text-gray-500").textContent =
        `${Math.round(current)} / ${target} ${label === "Calories" ? "kcal" : "g"}`;
      card.querySelector(".rounded-full div").style.width = `${percent}%`;
    });
  }

  render(id, data, func) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = data.length
      ? data.map((item) => func(item)).join("")
      : UI.emptyState;
  }

  debounce(func, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => func.apply(this, args), wait);
    };
  }

  hideLoader() {
    const loader = document.getElementById("app-loading-overlay");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => (loader.style.display = "none"), 500);
  }
}

new NutriPlanApp();
