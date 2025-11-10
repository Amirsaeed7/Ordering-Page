// js/order.js
document.addEventListener("DOMContentLoaded", async () => {
  const menuContainer = document.getElementById("menuContainer");
  const submitFoodBtn = document.getElementById("submitFood");
  const submitOrderBtn = document.getElementById("submitOrder");
  const orderList = document.getElementById("orderList");
  const orderNumberEl = document.getElementById("orderNumber");

  let menuData = {};
  let currentOrder = [];
  let selectedFood = null;
  let selectedToppings = [];

  // Load order number and date from localStorage
  let savedOrderNumber = parseInt(localStorage.getItem("orderNumber") || "1");
  let savedDate = localStorage.getItem("orderDate");

  // Get today's date (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];

  // If it's a new day, reset order number to 1
  if (savedDate !== today) {
    localStorage.setItem("orderNumber", "1");
    localStorage.setItem("orderDate", today);
    savedOrderNumber = 1;
  }

  // Use the (possibly reset) number
  let orderNumber = savedOrderNumber;
  orderNumberEl.textContent = orderNumber;

  // Utilities
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Try to load persisted prices (so prices don't change every reload)
  function loadPersistedPrices() {
    try {
      const raw = localStorage.getItem("menuPrices_v1");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function savePersistedPrices(obj) {
    try {
      localStorage.setItem("menuPrices_v1", JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }

  // Fetch menu data
  try {
    const res = await fetch("menuData.json");
    menuData = await res.json();

    // Ensure menuData has expected arrays
    if (!Array.isArray(menuData.foods)) menuData.foods = [];
    if (!Array.isArray(menuData.toppings)) menuData.toppings = [];

    // Load persisted prices (if any)
    const persisted = loadPersistedPrices();

    // Build price mappings (use persisted if available, else generate and persist)
    const priceMap = { foods: {}, toppings: {} };

    // Foods: assign price 100-150
    menuData.foods = menuData.foods.map((f) => {
      const name = f.name;
      const price =
        (persisted && persisted.foods && persisted.foods[name] != null)
          ? persisted.foods[name]
          : randInt(100, 150);
      priceMap.foods[name] = price;
      return { name, price };
    });

    // Toppings: assign price 10-20
    menuData.toppings = menuData.toppings.map((t) => {
      // if toppings array contains objects (name, price), normalize
      if (typeof t === "object" && t.name) {
        // if price already present, keep; else generate or use persisted
        const name = t.name;
        const price =
          (persisted && persisted.toppings && persisted.toppings[name] != null)
            ? persisted.toppings[name]
            : (typeof t.price === "number" ? t.price : randInt(10, 20));
        priceMap.toppings[name] = price;
        return { name, price };
      } else {
        const name = String(t);
        const price =
          (persisted && persisted.toppings && persisted.toppings[name] != null)
            ? persisted.toppings[name]
            : randInt(10, 20);
        priceMap.toppings[name] = price;
        return { name, price };
      }
    });

    // Persist prices if none existed
    if (!persisted) {
      savePersistedPrices(priceMap);
    }

    renderMenu();
  } catch (err) {
    console.error("Error loading menu data:", err);
  }

  // price helpers
  function getPriceForFood(name) {
    const f = menuData.foods.find((x) => x.name === name);
    return f ? f.price : 0;
  }
  function getPriceForTopping(name) {
    const t = menuData.toppings.find((x) => x.name === name);
    return t ? t.price : 0;
  }

  function formatCurrency(n) {
    return `${n} تومان`;
  }

  // Render menu
  function renderMenu() {
    if (!menuContainer) return;
    menuContainer.innerHTML = "";

    const section = document.createElement("div");
    section.className = "menu-section flex flex-col gap-4";

    // --- Foods list ---
    const foodSection = document.createElement("div");
    foodSection.className = "foods mb-4";

    const foodTitle = document.createElement("h2");
    foodTitle.className = "text-xl font-bold mb-2";
    foodTitle.textContent = "غذاها";
    foodSection.appendChild(foodTitle);

    const foodList = document.createElement("div");
    foodList.className = "flex flex-wrap gap-4";

    menuData.foods.forEach((food) => {
      const foodLabel = document.createElement("label");
      foodLabel.className = "flex items-center gap-2 border p-2 rounded";

      const foodCheckbox = document.createElement("input");
      foodCheckbox.type = "checkbox";
      foodCheckbox.name = "food";
      foodCheckbox.value = food.name;

      // Only one food can be selected at a time
      foodCheckbox.addEventListener("change", () => {
        document.querySelectorAll('input[name="food"]').forEach((cb) => {
          if (cb !== foodCheckbox) cb.checked = false;
        });
        selectedFood = foodCheckbox.checked ? food : null;
      });

      const textWrap = document.createElement("div");
      textWrap.className = "flex flex-col";
      const foodNameSpan = document.createElement("span");
      foodNameSpan.textContent = food.name;
      const foodPriceSpan = document.createElement("span");
      foodPriceSpan.className = "text-sm text-gray-600";
      foodPriceSpan.textContent = formatCurrency(food.price);

      textWrap.appendChild(foodNameSpan);
      textWrap.appendChild(foodPriceSpan);

      foodLabel.appendChild(foodCheckbox);
      foodLabel.appendChild(textWrap);
      foodList.appendChild(foodLabel);
    });

    foodSection.appendChild(foodList);
    section.appendChild(foodSection);

    // --- Toppings list ---
    const toppingSection = document.createElement("div");
    toppingSection.className = "toppings";

    const toppingTitle = document.createElement("h2");
    toppingTitle.className = "text-xl font-bold mb-2";
    toppingTitle.textContent = "تاپینگ‌ها";
    toppingSection.appendChild(toppingTitle);

    const toppingList = document.createElement("div");
    toppingList.className = "flex flex-wrap gap-4";

    menuData.toppings.forEach((top) => {
      const topLabel = document.createElement("label");
      topLabel.className = "flex items-center gap-2 border p-2 rounded";

      const topCheckbox = document.createElement("input");
      topCheckbox.type = "checkbox";
      topCheckbox.classList.add("topping-checkbox");
      topCheckbox.value = top.name;

      topCheckbox.addEventListener("change", () => {
        if (topCheckbox.checked) {
          if (!selectedToppings.includes(top.name)) selectedToppings.push(top.name);
        } else {
          selectedToppings = selectedToppings.filter((t) => t !== top.name);
        }
      });

      const textWrap = document.createElement("div");
      textWrap.className = "flex flex-col";
      const topNameSpan = document.createElement("span");
      topNameSpan.textContent = top.name;
      const topPriceSpan = document.createElement("span");
      topPriceSpan.className = "text-sm text-gray-600";
      topPriceSpan.textContent = `+ ${formatCurrency(top.price)}`;

      textWrap.appendChild(topNameSpan);
      textWrap.appendChild(topPriceSpan);

      topLabel.appendChild(topCheckbox);
      topLabel.appendChild(textWrap);
      toppingList.appendChild(topLabel);
    });

    toppingSection.appendChild(toppingList);
    section.appendChild(toppingSection);

    menuContainer.appendChild(section);
  }

  // Add food to order summary
  submitFoodBtn.addEventListener("click", () => {
    if (!selectedFood) {
      alert("لطفاً یک غذا انتخاب کنید.");
      return;
    }

    // compute item total: food price + toppings prices
    const basePrice = getPriceForFood(selectedFood.name);
    const toppingsPrices = selectedToppings.map((t) => getPriceForTopping(t) || 0);
    const toppingsTotal = toppingsPrices.reduce((s, v) => s + v, 0);
    const itemTotal = basePrice + toppingsTotal;

    const orderItem = {
      food: selectedFood.name,
      foodPrice: basePrice,
      toppings: [...selectedToppings],
      toppingsTotal,
      itemTotal,
    };

    currentOrder.push(orderItem);
    updateOrderList();

    // Reset selections
    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));

    selectedFood = null;
    selectedToppings = [];
  });

  // Update order summary (with delete button per item and factor total)
  function updateOrderList() {
    orderList.innerHTML = "";

    if (currentOrder.length === 0) {
      const emptyMsg = document.createElement("li");
      emptyMsg.className = "text-gray-500";
      emptyMsg.textContent = "هیچ غذایی در فاکتور ثبت نشده است.";
      orderList.appendChild(emptyMsg);
      return;
    }

    let factorTotal = 0;

    currentOrder.forEach((item, index) => {
      factorTotal += item.itemTotal || 0;

      const li = document.createElement("li");
      li.className = "flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md shadow-sm mb-2";

      const info = document.createElement("div");
      info.className = "flex flex-col";
      const titleRow = document.createElement("div");
      titleRow.className = "flex items-center gap-3";
      const nameEl = document.createElement("strong");
      nameEl.textContent = item.food;
      const priceEl = document.createElement("span");
      priceEl.className = "text-sm text-gray-700";
      priceEl.textContent = formatCurrency(item.itemTotal || 0);

      titleRow.appendChild(nameEl);
      titleRow.appendChild(priceEl);

      const toppingsEl = document.createElement("div");
      toppingsEl.className = "text-xs text-gray-600";
      toppingsEl.textContent =
        item.toppings && item.toppings.length ? `(${item.toppings.join(", ")})` : "";

      info.appendChild(titleRow);
      info.appendChild(toppingsEl);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "text-red-600 hover:text-red-800 mr-2";
      deleteBtn.title = "حذف";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.addEventListener("click", () => {
        // remove this item and re-render
        currentOrder.splice(index, 1);
        updateOrderList();
      });

      li.appendChild(info);
      li.appendChild(deleteBtn);
      orderList.appendChild(li);
    });

    // factor total row
    const totalLi = document.createElement("li");
    totalLi.className = "mt-3 pt-2 border-t border-gray-200 text-right font-bold";
    totalLi.textContent = `جمع کل فاکتور: ${formatCurrency(factorTotal)}`;
    orderList.appendChild(totalLi);
  }

  // Submit whole order
  submitOrderBtn.addEventListener("click", () => {
    if (currentOrder.length === 0) {
      alert("هیچ غذایی انتخاب نشده است!");
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem("orders")) || [];

    // compute order total
    const orderTotal = currentOrder.reduce((s, it) => s + (it.itemTotal || 0), 0);

    const newOrder = {
      orderNumber,
      items: currentOrder,
      total: orderTotal,
      date: new Date().toLocaleString("fa-IR"),
    };

    allOrders.push(newOrder);
    localStorage.setItem("orders", JSON.stringify(allOrders));

    orderNumber++;
    localStorage.setItem("orderNumber", orderNumber);
    localStorage.setItem("orderDate", today);
    orderNumberEl.textContent = orderNumber;

    // Reset current order
    currentOrder = [];
    updateOrderList();

    alert("سفارش با موفقیت ثبت شد ✅");
  });
});
 