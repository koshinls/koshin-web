document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll(".login-button").forEach((button) => {
  button.addEventListener("click", () => {
    alert(`${button.dataset.provider} login will be connected later.`);
  });
});

document.getElementById("guestButton").addEventListener("click", () => {
  document.querySelector(".login-note").textContent = "Guest mode selected. Real accounts will be added later.";
});
