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

  // Load order number from localStorage
  let orderNumber = parseInt(localStorage.getItem("orderNumber") || "1");
  orderNumberEl.textContent = orderNumber;

  // Fetch menu data
  try {
    const res = await fetch("menuData.json");
    menuData = await res.json();
    renderMenu();
  } catch (err) {
    console.error("Error loading menu data:", err);
  }

  // Render menu
  function renderMenu() {
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

      const foodText = document.createTextNode(food.name);
      foodLabel.appendChild(foodCheckbox);
      foodLabel.appendChild(foodText);
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
      topCheckbox.value = top;

      topCheckbox.addEventListener("change", () => {
        if (topCheckbox.checked) {
          selectedToppings.push(top);
        } else {
          selectedToppings = selectedToppings.filter((t) => t !== top);
        }
      });

      const topText = document.createTextNode(top);
      topLabel.appendChild(topCheckbox);
      topLabel.appendChild(topText);
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

    const orderItem = {
      food: selectedFood.name,
      toppings: selectedToppings,
    };

    currentOrder.push(orderItem);
    updateOrderList();

    // Reset selections
    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));

    selectedFood = null;
    selectedToppings = [];
  });

  // Update order summary
  function updateOrderList() {
    orderList.innerHTML = "";
    currentOrder.forEach((item) => {
      const li = document.createElement("li");
      li.className = "flex flex-col";
      li.innerHTML = `<strong>${item.food}</strong>${
        item.toppings.length
          ? ` <span class="text-gray-600">(${item.toppings.join(", ")})</span>`
          : ""
      }`;
      orderList.appendChild(li);
    });
  }

  // Submit whole order
  submitOrderBtn.addEventListener("click", () => {
    if (currentOrder.length === 0) {
      alert("هیچ غذایی انتخاب نشده است!");
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem("orders")) || [];

    const newOrder = {
      orderNumber,
      items: currentOrder,
      date: new Date().toLocaleString("fa-IR"),
    };

    allOrders.push(newOrder);
    localStorage.setItem("orders", JSON.stringify(allOrders));

    // Increment order number
    orderNumber++;
    localStorage.setItem("orderNumber", orderNumber);
    orderNumberEl.textContent = orderNumber;

    // Reset current order
    currentOrder = [];
    updateOrderList();

    alert("سفارش با موفقیت ثبت شد ✅");
  });
});
