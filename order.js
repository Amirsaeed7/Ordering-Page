document.addEventListener("DOMContentLoaded", async () => {
  const menuContainer = document.getElementById("menuContainer");
  const submitFoodBtn = document.getElementById("submitFood");
  const submitOrderBtn = document.getElementById("submitOrder");
  const orderList = document.getElementById("orderList");
  const orderNumberEl = document.getElementById("orderNumber");

  let menuData = [];
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

    menuData.forEach((category, catIndex) => {
      const section = document.createElement("div");
      section.className = "section";

      const title = document.createElement("h2");
      title.className = "text-xl font-bold mb-3";
      title.textContent = category.category;
      section.appendChild(title);

      category.items.forEach((food, foodIndex) => {
        const foodDiv = document.createElement("div");
        foodDiv.className = "mb-2";

        const foodLabel = document.createElement("label");
        foodLabel.className = "font-semibold flex items-center gap-2";

        const foodCheckbox = document.createElement("input");
        foodCheckbox.type = "checkbox";
        foodCheckbox.name = `food-${catIndex}`;
        foodCheckbox.value = food.name;

        foodCheckbox.addEventListener("change", () => {
          // Only one food can be selected at a time
          document
            .querySelectorAll(`input[name="food-${catIndex}"]`)
            .forEach((cb) => {
              if (cb !== foodCheckbox) cb.checked = false;
            });

          selectedFood = foodCheckbox.checked ? food : null;
          selectedToppings = [];

          // Reset all topping checkboxes
          document
            .querySelectorAll(`.topping-checkbox`)
            .forEach((cb) => (cb.checked = false));
        });

        const foodText = document.createTextNode(food.name);
        foodLabel.appendChild(foodCheckbox);
        foodLabel.appendChild(foodText);

        foodDiv.appendChild(foodLabel);

        // Add toppings
        const toppingsDiv = document.createElement("div");
        toppingsDiv.className = "ml-6 mt-1";

        food.toppings.forEach((top) => {
          const topLabel = document.createElement("label");
          topLabel.className = "flex items-center gap-1 topping";

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

          toppingsDiv.appendChild(topLabel);
        });

        foodDiv.appendChild(toppingsDiv);
        section.appendChild(foodDiv);
      });

      menuContainer.appendChild(section);
    });
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
    document
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));

    selectedFood = null;
    selectedToppings = [];
  });

  // Update order summary
  function updateOrderList() {
    orderList.innerHTML = "";
    currentOrder.forEach((item, index) => {
      const li = document.createElement("li");
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

    const allOrders =
      JSON.parse(localStorage.getItem("orders")) || [];

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
