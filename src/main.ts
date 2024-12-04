// todo
const app = document.querySelector<HTMLDivElement>("#app")!;

const button = document.createElement("button");
button.innerHTML = "click me!";

button.addEventListener("click", () => {
  alert("You clicked the button!");
});

app.append(button);
