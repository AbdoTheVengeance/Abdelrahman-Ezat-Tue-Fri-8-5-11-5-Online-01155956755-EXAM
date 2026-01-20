const MEAL_BASE_URL = "https://www.themealdb.com/api/json/v1/1";
const PRODUCT_BASE_URL = "https://world.openfoodfacts.org/cgi/search.pl";

export const API = {
  async call(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Fetch failed:", url, e);
      return null;
    }
  },

  getCategories: () => API.call(`${MEAL_BASE_URL}/categories.php`),

  getMeals: async (q = "") => {
    const data = await API.call(`${MEAL_BASE_URL}/search.php?s=${q}`);
    return data?.meals?.slice(0, 25) || [];
  },

  getMealById: (id) => API.call(`${MEAL_BASE_URL}/lookup.php?i=${id}`),

  filterByCategory: (cat) => API.call(`${MEAL_BASE_URL}/filter.php?c=${cat}`),

  filterByArea: (area) => API.call(`${MEAL_BASE_URL}/filter.php?a=${area}`),

  searchProducts: async (q) => {
    const url = `${PRODUCT_BASE_URL}?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20`;
    const data = await API.call(url);
    return data?.products || [];
  },

  getProductByBarcode: async (code) => {
    const data = await API.call(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
    );
    return data?.product ? [data.product] : [];
  },
};
