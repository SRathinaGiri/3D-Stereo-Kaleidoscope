import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('kaleidoscope-container');
const canvas = document.getElementById('kaleidoscope-canvas');
const reflectionsInput = document.getElementById('reflectionsInput');
const generateButton = document.getElementById('generateButton');
const eyeSepSlider = document.getElementById('eyeSepSlider');
const focusSlider = document.getElementById('focusSlider');
const fovSlider = document.getElementById('fovSlider');
const swapEyesButton = document.getElementById('swapEyesButton');
const sizeInput = document.getElementById('sizeInput');
const resizeButton = document.getElementById('resizeButton');
const effectSelect = document.getElementById('effectSelect');
const startAutoRotateButton = document.getElementById('startAutoRotateButton');
const stopAutoRotateButton = document.getElementById('stopAutoRotateButton');
const saveButton = document.getElementById('saveButton');
const textInput = document.getElementById('textInput');
const textGenerateButton = document.getElementById('textGenerateButton');
const bgColorPicker = document.getElementById('bgColorPicker');
const fontSelect = document.getElementById('fontSelect');

const SPACE_SIZE = 20;
const PLACEMENT_ATTEMPTS = 50;

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(container.clientWidth, container.clientHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(bgColorPicker.value);

const camera = new THREE.PerspectiveCamera(parseInt(fovSlider.value), container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.z = 15;

const stereoCamera = new THREE.StereoCamera();

const controls = new OrbitControls(camera, container);
controls.enablePan = false;
controls.enableZoom = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

let eyesSwapped = false;
let isAutoRotating = false;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

let kaleidoscopeGroup = new THREE.Group();
scene.add(kaleidoscopeGroup);

let font = null;
const fontLoader = new FontLoader();
const fontUrls = {
    helvetiker: 'https://unpkg.com/three@0.164.1/examples/fonts/helvetiker_regular.typeface.json',
    optimer: 'https://unpkg.com/three@0.164.1/examples/fonts/optimer_regular.typeface.json',
    gentilis: 'https://unpkg.com/three@0.164.1/examples/fonts/gentilis_regular.typeface.json'
};

function loadFont(name) {
    textGenerateButton.disabled = true;
    fontLoader.load(fontUrls[name], (loadedFont) => {
        font = loadedFont;
        textGenerateButton.disabled = false;
    });
}

fontSelect.addEventListener('change', () => loadFont(fontSelect.value));
loadFont(fontSelect.value);

function getSelectedShapes() {
    const checkboxes = document.querySelectorAll('.shape-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function clearScene() {
    kaleidoscopeGroup.clear();
    kaleidoscopeGroup.position.set(0, 0, 0);
    kaleidoscopeGroup.rotation.set(0, 0, 0);
}

function isColliding(newObject, placedObjects) {
    for (const placed of placedObjects) {
        const distance = newObject.position.distanceTo(placed.position);
        if (distance < (newObject.radius + placed.radius)) {
            return true;
        }
    }
    return false;
}

function populateSliceWithShapes(sliceGroup, effect) {
    const availableShapes = getSelectedShapes();
    if (availableShapes.length === 0) {
        console.warn("No shapes selected.");
        return;
    }
    const objectCount = 30;
    const placedObjects = [];
    for (let i = 0; i < objectCount; i++) {
        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
            const size = Math.random() * 0.5 + 0.15;
            const newObject = {
                position: new THREE.Vector3(),
                radius: size * 1.5
            };
            switch (effect) {
                case 'tunnel': {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 1 + Math.random() * 4;
                    newObject.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * SPACE_SIZE);
                    break;
                }
                case 'spiral': {
                    const spiralAngle = i * 0.4 + (Math.random() - 0.5);
                    const spiralRadius = i * 0.25;
                    newObject.position.set(Math.cos(spiralAngle) * spiralRadius, Math.sin(spiralAngle) * spiralRadius, -i * 0.4);
                    break;
                }
                case 'zoom': {
                    newObject.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, -i * 0.8);
                    break;
                }
                case 'sphere': {
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    const r = 5;
                    newObject.position.set(
                        Math.sin(phi) * Math.cos(theta) * r,
                        Math.sin(phi) * Math.sin(theta) * r,
                        Math.cos(phi) * r
                    );
                    break;
                }
                default:
                    newObject.position.set((Math.random() - 0.5) * SPACE_SIZE, (Math.random() - 0.5) * SPACE_SIZE, (Math.random() - 0.5) * SPACE_SIZE);
            }
            if (!isColliding(newObject, placedObjects)) {
                placedObjects.push(newObject);
                const type = availableShapes[Math.floor(Math.random() * availableShapes.length)];
                let geometry;
                if (type === 'sphere') geometry = new THREE.SphereGeometry(size, 32, 16);
                else if (type === 'box') geometry = new THREE.BoxGeometry(size, size, size);
                else if (type === 'cone') geometry = new THREE.ConeGeometry(size, size * 2, 32);
                else if (type === 'cylinder') geometry = new THREE.CylinderGeometry(size * 0.7, size * 0.7, size * 1.5, 32);
                else if (type === 'torus') geometry = new THREE.TorusGeometry(size, size * 0.4, 16, 100);
                else if (type === 'tetrahedron') geometry = new THREE.TetrahedronGeometry(size);
                else if (type === 'octahedron') geometry = new THREE.OctahedronGeometry(size);
                else if (type === 'icosahedron') geometry = new THREE.IcosahedronGeometry(size);
                else if (type === 'torusKnot') geometry = new THREE.TorusKnotGeometry(size, size * 0.3, 100, 16);
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(Math.random(), Math.random(), Math.random())
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.copy(newObject.position);
                mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                sliceGroup.add(mesh);
                break;
            }
        }
    }
}

function createWordObject(text) {
    if (!font) return null;
    const wordGroup = new THREE.Group();
    let currentX = 0;
    for (const char of text) {
        const textGeometry = new TextGeometry(char, {
            font: font,
            size: 1.0,
            depth: 0.2
        });
        textGeometry.computeBoundingBox();
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random())
        });
        const mesh = new THREE.Mesh(textGeometry, material);
        mesh.position.x = currentX;
        wordGroup.add(mesh);
        currentX += textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x + 0.1;
    }
    return wordGroup;
}

function createKaleidoscopeFromText(text, numReflections, effect) {
    if (!font) return;
    clearScene();
    const placedObjects = [];
    const wordCount = 10;
    for (let i = 0; i < wordCount; i++) {
        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
            const wordObject = createWordObject(text);
            if (!wordObject) continue;
            new THREE.Box3().setFromObject(wordObject).getBoundingSphere(wordObject.boundingSphere = new THREE.Sphere());
            const newObjectData = {
                position: new THREE.Vector3(),
                radius: wordObject.boundingSphere.radius
            };
            switch (effect) {
                case 'tunnel': {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 1 + Math.random() * 4;
                    newObjectData.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * SPACE_SIZE);
                    break;
                }
                case 'spiral': {
                    const spiralAngle = i * 0.8 + (Math.random() - 0.5);
                    const spiralRadius = i * 0.8;
                    newObjectData.position.set(Math.cos(spiralAngle) * spiralRadius, Math.sin(spiralAngle) * spiralRadius, -i);
                    break;
                }
                case 'zoom': {
                    newObjectData.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, -i * 2);
                    break;
                }
                case 'sphere': {
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    const r = 5;
                    newObjectData.position.set(
                        Math.sin(phi) * Math.cos(theta) * r,
                        Math.sin(phi) * Math.sin(theta) * r,
                        Math.cos(phi) * r
                    );
                    break;
                }
                default:
                    newObjectData.position.set((Math.random() - 0.5) * SPACE_SIZE, (Math.random() - 0.5) * SPACE_SIZE, (Math.random() - 0.5) * SPACE_SIZE);
            }
            if (!isColliding(newObjectData, placedObjects)) {
                placedObjects.push(newObjectData);
                wordObject.position.copy(newObjectData.position);
                wordObject.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                kaleidoscopeGroup.add(wordObject);
                break;
            }
        }
    }
    const masterSlice = kaleidoscopeGroup.clone();
    for (let i = 1; i < numReflections; i++) {
        const newSlice = masterSlice.clone();
        const angle = (2 * Math.PI / numReflections) * i;
        const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
        newSlice.applyQuaternion(quaternion);
        kaleidoscopeGroup.add(newSlice);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (isAutoRotating) {
        kaleidoscopeGroup.rotation.z += 0.002;
        kaleidoscopeGroup.rotation.y += 0.0005;
    }
    render();
}

function render() {
    const size = renderer.getSize(new THREE.Vector2());
    const halfWidth = size.width / 2;
    stereoCamera.update(camera);
    const eyeAspect = halfWidth / size.height;
    stereoCamera.cameraL.aspect = eyeAspect;
    stereoCamera.cameraR.aspect = eyeAspect;
    stereoCamera.cameraL.updateProjectionMatrix();
    stereoCamera.cameraR.updateProjectionMatrix();
    renderer.setScissorTest(true);
    const firstEye = eyesSwapped ? 'right' : 'left';
    const secondEye = eyesSwapped ? 'left' : 'right';
    renderer.setScissor(0, 0, halfWidth, size.height);
    renderer.setViewport(0, 0, halfWidth, size.height);
    renderer.render(scene, firstEye === 'left' ? stereoCamera.cameraL : stereoCamera.cameraR);
    renderer.setScissor(halfWidth, 0, halfWidth, size.height);
    renderer.setViewport(halfWidth, 0, halfWidth, size.height);
    renderer.render(scene, secondEye === 'left' ? stereoCamera.cameraL : stereoCamera.cameraR);
    renderer.setScissorTest(false);
}

function startAutoRotation() {
    isAutoRotating = true;
}

function stopAutoRotation() {
    isAutoRotating = false;
}

generateButton.addEventListener('click', () => {
    clearScene();
    const effect = effectSelect.value;
    const firstSlice = new THREE.Group();
    populateSliceWithShapes(firstSlice, effect);
    const numReflections = parseInt(reflectionsInput.value, 10);
    for (let i = 1; i < numReflections; i++) {
        const newSlice = firstSlice.clone();
        newSlice.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (2 * Math.PI / numReflections) * i));
        kaleidoscopeGroup.add(newSlice);
    }
    kaleidoscopeGroup.add(firstSlice);
});

textGenerateButton.addEventListener('click', () => {
    createKaleidoscopeFromText(textInput.value, parseInt(reflectionsInput.value, 10), effectSelect.value);
});

resizeButton.addEventListener('click', () => {
    const size = parseInt(sizeInput.value, 10);
    container.style.width = `${size * 2}px`;
    container.style.height = `${size}px`;
});

swapEyesButton.addEventListener('click', () => {
    eyesSwapped = !eyesSwapped;
    swapEyesButton.textContent = eyesSwapped ? 'Normal' : 'Cross-View';
});

eyeSepSlider.addEventListener('input', () => {
    stereoCamera.eyeSep = eyeSepSlider.value / 200;
    if (!isAutoRotating) render();
});

focusSlider.addEventListener('input', () => {
    camera.focus = focusSlider.value;
    if (!isAutoRotating) render();
});

fovSlider.addEventListener('input', () => {
    camera.fov = parseInt(fovSlider.value, 10);
    camera.updateProjectionMatrix();
    if (!isAutoRotating) render();
});

bgColorPicker.addEventListener('input', (event) => {
    scene.background.set(event.target.value);
    if (!isAutoRotating) render();
});

startAutoRotateButton.addEventListener('click', startAutoRotation);
stopAutoRotateButton.addEventListener('click', stopAutoRotation);

saveButton.addEventListener('click', () => {
    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);
    const highResWidth = 2000;
    const highResHeight = 1000;
    renderer.setSize(highResWidth, highResHeight, false);
    camera.aspect = highResWidth / highResHeight;
    camera.updateProjectionMatrix();
    render();
    const link = document.createElement('a');
    link.download = 'kaleidoscope-high-res.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
    renderer.setSize(originalSize.width, originalSize.height, false);
    camera.aspect = originalSize.width / originalSize.height;
    camera.updateProjectionMatrix();
    if (!isAutoRotating) render();
});

function onContainerResize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    if (!isAutoRotating) render();
}

const resizeObserver = new ResizeObserver(onContainerResize);
resizeObserver.observe(container);

// Initial settings call
eyeSepSlider.dispatchEvent(new Event('input'));
focusSlider.dispatchEvent(new Event('input'));
fovSlider.dispatchEvent(new Event('input'));

// Initial Call
generateButton.click();
startAutoRotation();
animate();