const canvas = document.getElementById('matrixBG');
const ctx = canvas.getContext('2d');
const getCSSVariable = (varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};
const config = {
    color: getCSSVariable('--hacker-color'),
    speed: 50,
    fontSize:20
};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const chars = "0123456789$#!*&%@+=-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

// This is the secret: we only track the Y position for each column
const columns = Math.floor(canvas.width / config.fontSize);
const rain = [];
for (let i = 0; i < columns; i++) {
    // Instead of 1, we pick a random negative starting point.
    // This forces columns to "wait" before they enter the screen.
    rain[i] = Math.floor(Math.random() * -100);
}

function draw() {
    // 1. Transparent black to create the trail
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Set font style
    ctx.font = config.fontSize + "px 'VT323', monospace";

    // 3. Draw one character per column per frame
    for (let i = 0; i < rain.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];

        // We draw at (X * fontSize) and (Y * fontSize)
        // This ensures they are ALWAYS perfectly aligned in a grid
        const x = i * config.fontSize;
        const y = rain[i] * config.fontSize;

        ctx.fillStyle = config.color;
        ctx.fillText(text, x, y);

        // 4. Reset or Move
        // If it hits the bottom, reset to top randomly
        if (y > canvas.height && Math.random() > 0.975) {
            rain[i] = 0;
        }

        // Increment the row index
        rain[i]++;
    }
}

setInterval(draw, config.speed);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});