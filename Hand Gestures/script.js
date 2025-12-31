// --------------------
// 1. INITIALIZATION
// --------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const particleCount = 6000;
const geometry = new THREE.BufferGeometry();

const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const targetPositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
    targetPositions[i] = positions[i];
    colors[i] = Math.random();
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

camera.position.z = 15;

// --------------------
// 2. SHAPE GENERATORS
// --------------------
function makeHeart() {
    for (let i = 0; i < particleCount; i++) {
        const t = Math.random() * Math.PI * 2;
        const i3 = i * 3;

        targetPositions[i3]     = 0.4 * (16 * Math.pow(Math.sin(t), 3));
        targetPositions[i3 + 1] = 0.4 * (
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)
        );
        targetPositions[i3 + 2] = (Math.random() - 0.5) * 2;
    }
}

function makeSaturn() {
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        if (i < particleCount * 0.4) {
            const phi = Math.acos(-1 + (2 * i) / (particleCount * 0.4));
            const theta = Math.sqrt(particleCount * 0.4 * Math.PI) * phi;

            targetPositions[i3]     = 4 * Math.cos(theta) * Math.sin(phi);
            targetPositions[i3 + 1] = 4 * Math.sin(theta) * Math.sin(phi);
            targetPositions[i3 + 2] = 4 * Math.cos(phi);
        } else {
            const angle = Math.random() * Math.PI * 2;
            const radius = 6 + Math.random() * 3;

            targetPositions[i3]     = radius * Math.cos(angle);
            targetPositions[i3 + 1] = (Math.random() - 0.5) * 0.5;
            targetPositions[i3 + 2] = radius * Math.sin(angle);
        }
    }
}

function makeRandom() {
    for (let i = 0; i < particleCount * 3; i++) {
        targetPositions[i] = (Math.random() - 0.5) * 15;
    }
}

// --------------------
// 3. HAND TRACKING
// --------------------
const videoElement = document.getElementById("webcam");

const hands = new Hands({
    locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    if (!results.multiHandLandmarks?.length) return;

    const hand = results.multiHandLandmarks[0];

    particles.rotation.y = hand[0].x * Math.PI;
    particles.rotation.x = hand[0].y * Math.PI;

    const dx = hand[4].x - hand[8].x;
    const dy = hand[4].y - hand[8].y;
    const pinchDist = Math.sqrt(dx * dx + dy * dy);

    const middleUp = hand[12].y < hand[10].y;

    if (pinchDist < 0.05) {
        makeHeart();
    } else if (middleUp) {
        makeSaturn();
    } else {
        if (hand[8].y < hand[6].y && hand[20].y < hand[18].y) {
            makeRandom();
        }
    }

    const colorAttr = geometry.attributes.color;
    for (let i = 0; i < particleCount * 3; i += 3) {
        colorAttr.array[i]     = hand[8].x;
        colorAttr.array[i + 1] = hand[8].y;
        colorAttr.array[i + 2] = 1 - hand[8].x;
    }
    colorAttr.needsUpdate = true;
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

cameraUtils.start();

// --------------------
// 4. ANIMATION LOOP
// --------------------
function animate() {
    requestAnimationFrame(animate);

    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.array.length; i++) {
        posAttr.array[i] +=
            (targetPositions[i] - posAttr.array[i]) * 0.1;
    }
    posAttr.needsUpdate = true;

    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
