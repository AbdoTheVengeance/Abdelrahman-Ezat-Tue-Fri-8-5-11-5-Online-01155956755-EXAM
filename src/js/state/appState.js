export const state = {
  page: "meals", // meals | products | foodlog | details

  recipes: [],
  categories: [],
  currentMeal: null,
  products: [],

  setPage(nextPage) {
    this.page = nextPage;

    // for the UI to listen to page changes
    document.dispatchEvent(
      new CustomEvent("pageChanged", { detail: nextPage }),
    );
  },

  resetMeal() {
    this.currentMeal = null;
  },
};
