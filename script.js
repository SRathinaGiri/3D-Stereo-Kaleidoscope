import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// --- Element Selection ---
const container = document.getElementById('kaleidoscope-container');
const canvas = document.getElementById('kaleidoscope-canvas');
const reflectionsInput = document.getElementById('reflectionsInput');
const reflectionsEnabled = document.getElementById('reflectionsEnabled');
const objectCountInput = document.getElementById('objectCountInput');
const modeSelect = document.getElementById('modeSelect');
const generateButton = document.getElementById('generateButton');
const eyeSepSlider = document.getElementById('eyeSepSlider');
const focusSlider = document.getElementById('focusSlider');
const fovSlider = document.getElementById('fovSlider');
const swapEyesButton = document.getElementById('swapEyesButton');
const sizeInput = document.getElementById('sizeInput');
const resizeButton = document.getElementById('resizeButton');
const previewScaleInput = document.getElementById('previewScaleInput');
const previewScaleValue = document.getElementById('previewScaleValue');
const effectSelect = document.getElementById('effectSelect');
const animateCheckbox = document.getElementById('animateCheckbox');
const speedSlider = document.getElementById('speedSlider');
const saveButton = document.getElementById('saveButton');
const startRecordingButton = document.getElementById('startRecordingButton');
const stopRecordingButton = document.getElementById('stopRecordingButton');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const toggleAutoButton = document.getElementById('toggleAutoButton');
const textInput = document.getElementById('textInput');
const bgColorPicker = document.getElementById('bgColorPicker');
const fontSelect = document.getElementById('fontSelect');
const reflectCheckbox = document.getElementById('reflectCheckbox');
const transparentCheckbox = document.getElementById('transparentCheckbox');
const opacitySlider = document.getElementById('opacitySlider');
const zoomEnable = document.getElementById('zoomEnable');
const panEnable = document.getElementById('panEnable');
const spiralArms = document.getElementById('spiralArms');
const spiralTurns = document.getElementById('spiralTurns');
const spiralRadiusStart = document.getElementById('spiralRadiusStart');
const spiralRadiusEnd = document.getElementById('spiralRadiusEnd');
const spiralDepth = document.getElementById('spiralDepth');
const spiralJitter = document.getElementById('spiralJitter');
const tunnelRadiusMin = document.getElementById('tunnelRadiusMin');
const tunnelRadiusMax = document.getElementById('tunnelRadiusMax');
const tunnelDepth = document.getElementById('tunnelDepth');
const zoomStep = document.getElementById('zoomStep');
const sphereRadius = document.getElementById('sphereRadius');
const staticSpread = document.getElementById('staticSpread');
const stepRotateX = document.getElementById('stepRotateX');
const stepRotateY = document.getElementById('stepRotateY');
const stepRotateZ = document.getElementById('stepRotateZ');
const stepScale = document.getElementById('stepScale');
const sphereRadiusGeom = document.getElementById('sphereRadiusGeom');
const boxWidth = document.getElementById('boxWidth');
const boxHeight = document.getElementById('boxHeight');
const boxDepth = document.getElementById('boxDepth');
const coneRadius = document.getElementById('coneRadius');
const coneHeight = document.getElementById('coneHeight');
const cylinderRadiusTop = document.getElementById('cylinderRadiusTop');
const cylinderRadiusBottom = document.getElementById('cylinderRadiusBottom');
const cylinderHeight = document.getElementById('cylinderHeight');
const torusRadius = document.getElementById('torusRadius');
const torusTube = document.getElementById('torusTube');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const loadSettingsInput = document.getElementById('loadSettingsInput');
const objectTabButtonsContainer = document.getElementById('objectTabButtons');
const uiPanel = document.getElementById('uiPanel');
const collapsePanelButton = document.getElementById('collapsePanelButton');
const panelToggleButton = document.getElementById('panelToggle');
// --- Global State & Constants ---
let rotationSpeed = 1.0;
let isAnimating = false;
let eyesSwapped = false;
let activeObjectTab = null;
let autoRegenerate = true;
let pendingRegenerate = false;
let baseViewSize = parseInt(sizeInput.value, 10) || 400;
let previewScale = previewScaleInput ? parseFloat(previewScaleInput.value) || 1 : 1;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let kaleidoscopeGroup = new THREE.Group();
let roomEnvironmentTexture = null;
let font = null;
const fontUrls = { helvetiker: 'https://unpkg.com/three@0.164.1/examples/fonts/helvetiker_regular.typeface.json', optimer: 'https://unpkg.com/three@0.164.1/examples/fonts/optimer_regular.typeface.json', gentilis: 'https://unpkg.com/three@0.164.1/examples/fonts/gentilis_regular.typeface.json' };

// --- Responsive Panel Controls ---
const smallScreenQuery = window.matchMedia('(max-width: 900px)');
let panelUserOverride = false;

function setPanelCollapsed(collapsed, options = {}) {
    if (!uiPanel) return;
    const { fromUser = false } = options;
    document.body.classList.toggle('panel-collapsed', collapsed);
    if (panelToggleButton) {
        panelToggleButton.setAttribute('aria-expanded', (!collapsed).toString());
        panelToggleButton.textContent = collapsed ? 'Show Controls' : 'Hide Controls';
    }
    if (fromUser) {
        panelUserOverride = smallScreenQuery.matches;
    }
}

function syncPanelWithViewport(event) {
    const matches = typeof event.matches === 'boolean' ? event.matches : smallScreenQuery.matches;
    if (!matches) {
        panelUserOverride = false;
        setPanelCollapsed(false);
    } else if (!panelUserOverride) {
        setPanelCollapsed(true);
    }
}

syncPanelWithViewport(smallScreenQuery);
smallScreenQuery.addEventListener('change', syncPanelWithViewport);

if (panelToggleButton) {
    panelToggleButton.addEventListener('click', () => {
        const collapsed = document.body.classList.contains('panel-collapsed');
        setPanelCollapsed(!collapsed, { fromUser: true });
    });
}

if (collapsePanelButton) {
    collapsePanelButton.addEventListener('click', () => {
        setPanelCollapsed(true, { fromUser: true });
        panelToggleButton?.focus();
    });
}
// --- Core Three.js Setup ---
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(parseInt(fovSlider.value), 1, 0.1, 1000);
const stereoCamera = new THREE.StereoCamera();
const controls = new OrbitControls(camera, container);
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const fontLoader = new FontLoader();
function updateRecordingButtons() {
    if (!startRecordingButton || !stopRecordingButton) return;
    startRecordingButton.disabled = isRecording;
    stopRecordingButton.disabled = !isRecording;
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    try {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            return;
        }
    } catch (error) {
        console.error('Error stopping recording', error);
    }
    mediaRecorder = null;
    recordedChunks = [];
    updateRecordingButtons();
}

function startRecording() {
    if (isRecording) return;
    if (!startRecordingButton || !stopRecordingButton) return;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
        alert('Recording is not supported in this browser.');
        return;
    }
    const stream = canvas.captureStream(60);
    const preferredTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
        alert('Recording format is not supported in this browser.');
        return;
    }
    recordedChunks = [];
    try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
    } catch (error) {
        console.error('Unable to create MediaRecorder', error);
        alert('Unable to start recording.');
        mediaRecorder = null;
        return;
    }
    mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    mediaRecorder.onstop = () => {
        try {
            if (recordedChunks.length) {
                const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'video/webm' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'kaleidoscope-recording.webm';
                link.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to finalize recording', error);
        } finally {
            mediaRecorder = null;
            recordedChunks = [];
            isRecording = false;
            updateRecordingButtons();
        }
    };
    try {
        mediaRecorder.start();
    } catch (error) {
        console.error('Failed to start recording', error);
        alert('Failed to start recording.');
        mediaRecorder = null;
        recordedChunks = [];
        return;
    }
    isRecording = true;
    updateRecordingButtons();
}

function applyPreviewSize() {
    baseViewSize = Math.max(10, baseViewSize || 10);
    previewScale = Math.min(1, Math.max(0.1, previewScale || 1));
    const previewWidth = baseViewSize * 2 * previewScale;
    const previewHeight = baseViewSize * previewScale;
    container.style.width = `${previewWidth}px`;
    container.style.height = `${previewHeight}px`;
    if (previewScaleValue) {
        previewScaleValue.textContent = `${Math.round(previewScale * 100)}%`;
    }
}
function setup() {
    applyPreviewSize();
    renderer.setSize(container.clientWidth, container.clientHeight);
    scene.background = new THREE.Color(bgColorPicker.value);
    camera.position.z = 15;
    camera.focus = parseFloat(focusSlider.value);
    stereoCamera.eyeSep = parseFloat(eyeSepSlider.value) / 200;
    controls.enablePan = panEnable.checked;
    controls.enableZoom = zoomEnable.checked;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    scene.add(kaleidoscopeGroup);
    pmremGenerator.compileEquirectangularShader();
}
// --- Helper Functions ---
function loadFont(name) { fontLoader.load(fontUrls[name], (loadedFont) => { font = loadedFont; if (modeSelect.value === 'text') regenerate(); }); }
function getSelectedShapes() { const checkboxes = document.querySelectorAll('.shape-checkbox:checked'); return Array.from(checkboxes).map(cb => cb.value); }
function getSpiralPosition(i, total, params) { const arm = i % params.arms; const t = i / Math.max(1, total - 1); const armOffset = (2 * Math.PI / params.arms) * arm; const angle = armOffset + t * params.turns * 2 * Math.PI; const radius = params.radiusStart + t * (params.radiusEnd - params.radiusStart); const z = -t * params.depth; const jitter = params.jitter || 0; const x = Math.cos(angle) * radius + (Math.random() - 0.5) * jitter; const y = Math.sin(angle) * radius + (Math.random() - 0.5) * jitter; return new THREE.Vector3(x, y, z); }
function isColliding(newObject, placedObjects) { for (const placed of placedObjects) { if (newObject.position.distanceTo(placed.position) < newObject.radius + placed.radius) return true; } return false; }
function buildMaterial() { return new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()), transparent: transparentCheckbox.checked, opacity: parseFloat(opacitySlider.value), metalness: reflectCheckbox.checked ? 1.0 : 0.1, roughness: reflectCheckbox.checked ? 0.2 : 0.8, envMapIntensity: 1.0 }); }
function ensureEnvironment() { if (reflectCheckbox.checked && !roomEnvironmentTexture) { const roomEnv = new RoomEnvironment(); roomEnvironmentTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture; } scene.environment = reflectCheckbox.checked ? roomEnvironmentTexture : null; }
// --- Main Regeneration Logic ---
function regenerate() {
    clearScene();
    ensureEnvironment();
    const effect = effectSelect.value;
    const masterSlice = new THREE.Group();
    if (modeSelect.value === 'text') {
        populateSliceWithText(masterSlice, effect);
    } else {
        populateSliceWithShapes(masterSlice, effect);
    }
    kaleidoscopeGroup.add(masterSlice);
    if (reflectionsEnabled.checked) {
        const numReflections = parseInt(reflectionsInput.value, 10);
        for (let i = 1; i < numReflections; i++) {
            const newSlice = masterSlice.clone();
            const angle = (2 * Math.PI / numReflections) * i;
            const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
            newSlice.applyQuaternion(quaternion);
            kaleidoscopeGroup.add(newSlice);
        }
    }
    if (!isAnimating) render();
}
function clearScene() {
    kaleidoscopeGroup.traverse(child => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
    kaleidoscopeGroup.clear();
}
function populateSliceWithShapes(sliceGroup, effect) {
    const availableShapes = getSelectedShapes();
    if (availableShapes.length === 0) return;
    const objectCount = parseInt(objectCountInput.value, 10) || 30;
    const placedObjects = [];
    const rotStep = new THREE.Euler(THREE.MathUtils.degToRad(parseFloat(stepRotateX.value) || 0), THREE.MathUtils.degToRad(parseFloat(stepRotateY.value) || 0), THREE.MathUtils.degToRad(parseFloat(stepRotateZ.value) || 0));
    const scaleStepVal = parseFloat(stepScale.value) || 1;
    for (let i = 0; i < objectCount; i++) {
        for (let attempt = 0; attempt < 50; attempt++) {
            let geometry;
            const type = availableShapes[Math.floor(Math.random() * availableShapes.length)];
            if (type === 'sphere') { geometry = new THREE.SphereGeometry(parseFloat(sphereRadiusGeom.value), 32, 16); }
            else if (type === 'box') { geometry = new THREE.BoxGeometry(parseFloat(boxWidth.value), parseFloat(boxHeight.value), parseFloat(boxDepth.value)); }
            else if (type === 'cone') { geometry = new THREE.ConeGeometry(parseFloat(coneRadius.value), parseFloat(coneHeight.value), 32); }
            else if (type === 'cylinder') { geometry = new THREE.CylinderGeometry(parseFloat(cylinderRadiusTop.value), parseFloat(cylinderRadiusBottom.value), parseFloat(cylinderHeight.value), 32); }
            else if (type === 'torus') { geometry = new THREE.TorusGeometry(parseFloat(torusRadius.value), parseFloat(torusTube.value), 16, 100); }
            else if (type === 'tetrahedron') { geometry = new THREE.TetrahedronGeometry(0.8); }
            else if (type === 'octahedron') { geometry = new THREE.OctahedronGeometry(0.8); }
            else if (type === 'icosahedron') { geometry = new THREE.IcosahedronGeometry(0.8); }
            else if (type === 'torusKnot') { geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16); }
            else { continue; }
            geometry.computeBoundingSphere();
            const newObject = { position: new THREE.Vector3(), radius: geometry.boundingSphere.radius };
            switch (effect) {
                case 'tunnel': const angle = Math.random() * Math.PI * 2; const rMin = parseFloat(tunnelRadiusMin.value); const rMax = parseFloat(tunnelRadiusMax.value); const radius = rMin + Math.random() * Math.max(0, rMax - rMin); const depth = parseFloat(tunnelDepth.value); newObject.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * depth); break;
                case 'spiral': const params = { arms: parseInt(spiralArms.value), turns: parseFloat(spiralTurns.value), radiusStart: parseFloat(spiralRadiusStart.value), radiusEnd: parseFloat(spiralRadiusEnd.value), depth: parseFloat(spiralDepth.value), jitter: parseFloat(spiralJitter.value) }; newObject.position.copy(getSpiralPosition(i, objectCount, params)); break;
                case 'zoom': const step = parseFloat(zoomStep.value); newObject.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, -i * step); break;
                case 'sphere': const phi = Math.acos(2 * Math.random() - 1); const theta = Math.random() * Math.PI * 2; const r = parseFloat(sphereRadius.value); newObject.position.set(Math.sin(phi) * Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r, Math.cos(phi) * r); break;
                default: const spread = parseFloat(staticSpread.value); newObject.position.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
            }
            if (scaleStepVal !== 1) newObject.radius *= Math.pow(scaleStepVal, i);
            if (!isColliding(newObject, placedObjects)) {
                placedObjects.push(newObject);
                const mesh = new THREE.Mesh(geometry, buildMaterial());
                mesh.position.copy(newObject.position);
                mesh.rotation.set(Math.random() * Math.PI * 2 + rotStep.x * i, Math.random() * Math.PI * 2 + rotStep.y * i, Math.random() * Math.PI * 2 + rotStep.z * i);
                if (scaleStepVal !== 1) mesh.scale.multiplyScalar(Math.pow(scaleStepVal, i));
                sliceGroup.add(mesh);
                break;
            } else {
                geometry.dispose();
            }
        }
    }
}
function createCharacterMesh(char) {
    if (!font) return null;
    if (!char || !char.trim()) return null;
    const geometry = new TextGeometry(char, { font, size: 1.0, depth: 0.2, curveSegments: 12 });
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);
    }
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, buildMaterial());
}
function populateSliceWithText(sliceGroup, effect) {
    if (!font) return;
    const rawText = textInput.value || '';
    const characters = Array.from(rawText);
    if (!characters.length) return;
    const placedObjects = [];
    const rotStep = new THREE.Euler(
        THREE.MathUtils.degToRad(parseFloat(stepRotateX.value) || 0),
        THREE.MathUtils.degToRad(parseFloat(stepRotateY.value) || 0),
        THREE.MathUtils.degToRad(parseFloat(stepRotateZ.value) || 0)
    );
    const scaleStepVal = parseFloat(stepScale.value) || 1;
    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const mesh = createCharacterMesh(char);
        if (!mesh) continue;
        const randomRotation = {
            x: Math.random() * Math.PI + rotStep.x * i,
            y: Math.random() * Math.PI + rotStep.y * i,
            z: Math.random() * Math.PI + rotStep.z * i
        };
        const scaleMultiplier = scaleStepVal !== 1 ? Math.pow(scaleStepVal, i) : 1;
        let placed = false;
        let fallbackPlacement = null;
        for (let attempt = 0; attempt < 50; attempt++) {
            let baseRadius = 0.5;
            if (mesh.geometry) {
                mesh.geometry.computeBoundingSphere();
                if (mesh.geometry.boundingSphere) {
                    baseRadius = mesh.geometry.boundingSphere.radius;
                }
            } else if (mesh.userData && mesh.userData.radius) {
                baseRadius = mesh.userData.radius;
            }
            const newObjectData = { position: new THREE.Vector3(), radius: baseRadius };
            switch (effect) {
                case 'tunnel': {
                    const angle = Math.random() * Math.PI * 2;
                    const rMin = parseFloat(tunnelRadiusMin.value);
                    const rMax = parseFloat(tunnelRadiusMax.value);
                    const radius = rMin + Math.random() * Math.max(0, rMax - rMin);
                    const depth = parseFloat(tunnelDepth.value);
                    newObjectData.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * depth);
                    break;
                }
                case 'spiral': {
                    const params = {
                        arms: parseInt(spiralArms.value, 10),
                        turns: parseFloat(spiralTurns.value),
                        radiusStart: parseFloat(spiralRadiusStart.value),
                        radiusEnd: parseFloat(spiralRadiusEnd.value),
                        depth: parseFloat(spiralDepth.value),
                        jitter: parseFloat(spiralJitter.value)
                    };
                    newObjectData.position.copy(getSpiralPosition(i, characters.length, params));
                    break;
                }
                case 'zoom': {
                    const step = parseFloat(zoomStep.value);
                    newObjectData.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, -i * step);
                    break;
                }
                case 'sphere': {
                    const phi = Math.acos(2 * Math.random() - 1);
                    const theta = Math.random() * Math.PI * 2;
                    const r = parseFloat(sphereRadius.value);
                    newObjectData.position.set(Math.sin(phi) * Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r, Math.cos(phi) * r);
                    break;
                }
                default: {
                    const spread = parseFloat(staticSpread.value);
                    newObjectData.position.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
                    break;
                }
            }
            if (scaleMultiplier !== 1) {
                newObjectData.radius *= scaleMultiplier;
            }
            fallbackPlacement = { position: newObjectData.position.clone(), radius: newObjectData.radius };
            if (!isColliding(newObjectData, placedObjects)) {
                placedObjects.push(newObjectData);
                mesh.position.copy(newObjectData.position);
                mesh.rotation.set(randomRotation.x, randomRotation.y, randomRotation.z);
                if (scaleMultiplier !== 1) {
                    mesh.scale.multiplyScalar(scaleMultiplier);
                }
                sliceGroup.add(mesh);
                placed = true;
                break;
            }
        }
        if (!placed && fallbackPlacement) {
            placedObjects.push({ position: fallbackPlacement.position.clone(), radius: fallbackPlacement.radius });
            mesh.position.copy(fallbackPlacement.position);
            mesh.rotation.set(randomRotation.x, randomRotation.y, randomRotation.z);
            if (scaleMultiplier !== 1) {
                mesh.scale.multiplyScalar(scaleMultiplier);
            }
            sliceGroup.add(mesh);
        }
    }
}
function animate() { requestAnimationFrame(animate); controls.update(); if (isAnimating) { kaleidoscopeGroup.rotation.z += 0.002 * rotationSpeed; kaleidoscopeGroup.rotation.y += 0.0005 * rotationSpeed; } render(); }
function render() {
    const size = renderer.getSize(new THREE.Vector2());
    const halfWidth = size.width / 2;
    const eyeAspect = halfWidth / size.height;
    if (Math.abs(camera.aspect - eyeAspect) > 1e-6) {
        camera.aspect = eyeAspect;
        camera.updateProjectionMatrix();
    }
    stereoCamera.update(camera);
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
function getAllSettings() {
    const settings = {
        mode: modeSelect.value,
        reflections: parseInt(reflectionsInput.value, 10),
        reflectionsEnabled: reflectionsEnabled.checked,
        objectCount: parseInt(objectCountInput.value, 10),
        layout: effectSelect.value,
        backgroundColor: bgColorPicker.value,
        selectedShapes: getSelectedShapes(),
        spiral: { arms: parseInt(spiralArms.value, 10), turns: parseFloat(spiralTurns.value), radiusStart: parseFloat(spiralRadiusStart.value), radiusEnd: parseFloat(spiralRadiusEnd.value), depth: parseFloat(spiralDepth.value), jitter: parseFloat(spiralJitter.value) },
        tunnel: { radiusMin: parseFloat(tunnelRadiusMin.value), radiusMax: parseFloat(tunnelRadiusMax.value), depth: parseFloat(tunnelDepth.value) },
        zoom: { step: parseFloat(zoomStep.value) },
        sphere: { radius: parseFloat(sphereRadius.value) },
        static: { spread: parseFloat(staticSpread.value) },
        stepTransform: { rotateX: parseFloat(stepRotateX.value), rotateY: parseFloat(stepRotateY.value), rotateZ: parseFloat(stepRotateZ.value), scale: parseFloat(stepScale.value) },
        geomSphere: { radius: parseFloat(sphereRadiusGeom.value) },
        geomBox: { width: parseFloat(boxWidth.value), height: parseFloat(boxHeight.value), depth: parseFloat(boxDepth.value) },
        geomCone: { radius: parseFloat(coneRadius.value), height: parseFloat(coneHeight.value) },
        geomCylinder: { radiusTop: parseFloat(cylinderRadiusTop.value), radiusBottom: parseFloat(cylinderRadiusBottom.value), height: parseFloat(cylinderHeight.value) },
        geomTorus: { radius: parseFloat(torusRadius.value), tube: parseFloat(torusTube.value) },
        textMessage: textInput.value,
        font: fontSelect.value,
        reflective: reflectCheckbox.checked,
        transparent: transparentCheckbox.checked,
        opacity: parseFloat(opacitySlider.value),
        eyeSep: parseFloat(eyeSepSlider.value),
        focalDist: parseFloat(focusSlider.value),
        fov: parseFloat(fovSlider.value),
        crossView: eyesSwapped,
        animate: animateCheckbox.checked,
        speed: parseFloat(speedSlider.value),
        previewScale,
        viewSize: baseViewSize
    };
    return settings;
}
function saveSettings() { const settings = getAllSettings(); const jsonString = JSON.stringify(settings, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'kaleidoscope-settings.json'; link.click(); URL.revokeObjectURL(url); }
function applySettings(settings) {
    if (isRecording) {
        stopRecording();
    } else {
        updateRecordingButtons();
    }
    try {
        modeSelect.value = settings.mode;
        reflectionsInput.value = settings.reflections;
        reflectionsEnabled.checked = settings.reflectionsEnabled;
        objectCountInput.value = settings.objectCount;
        effectSelect.value = settings.layout;
        bgColorPicker.value = settings.backgroundColor;
        document.querySelectorAll('.shape-checkbox').forEach(cb => { cb.checked = settings.selectedShapes.includes(cb.value); });
        if (settings.spiral) { spiralArms.value = settings.spiral.arms; spiralTurns.value = settings.spiral.turns; spiralRadiusStart.value = settings.spiral.radiusStart; spiralRadiusEnd.value = settings.spiral.radiusEnd; spiralDepth.value = settings.spiral.depth; spiralJitter.value = settings.spiral.jitter; }
        if (settings.tunnel) { tunnelRadiusMin.value = settings.tunnel.radiusMin; tunnelRadiusMax.value = settings.tunnel.radiusMax; tunnelDepth.value = settings.tunnel.depth; }
        if (settings.zoom) { zoomStep.value = settings.zoom.step; }
        if (settings.sphere) { sphereRadius.value = settings.sphere.radius; }
        if (settings.static) { staticSpread.value = settings.static.spread; }
        if (settings.stepTransform) { stepRotateX.value = settings.stepTransform.rotateX; stepRotateY.value = settings.stepTransform.rotateY; stepRotateZ.value = settings.stepTransform.rotateZ; stepScale.value = settings.stepTransform.scale; }
        if (settings.geomSphere) sphereRadiusGeom.value = settings.geomSphere.radius;
        if (settings.geomBox) { boxWidth.value = settings.geomBox.width; boxHeight.value = settings.geomBox.height; boxDepth.value = settings.geomBox.depth; }
        if (settings.geomCone) { coneRadius.value = settings.geomCone.radius; coneHeight.value = settings.geomCone.height; }
        if (settings.geomCylinder) { cylinderRadiusTop.value = settings.geomCylinder.radiusTop; cylinderRadiusBottom.value = settings.geomCylinder.radiusBottom; cylinderHeight.value = settings.geomCylinder.height; }
        if (settings.geomTorus) { torusRadius.value = settings.geomTorus.radius; torusTube.value = settings.geomTorus.tube; }
        textInput.value = settings.textMessage;
        fontSelect.value = settings.font;
        reflectCheckbox.checked = settings.reflective;
        transparentCheckbox.checked = settings.transparent;
        opacitySlider.value = settings.opacity;
        eyeSepSlider.value = settings.eyeSep;
        focusSlider.value = settings.focalDist;
        fovSlider.value = settings.fov;
        eyesSwapped = settings.crossView;
        animateCheckbox.checked = settings.animate;
        speedSlider.value = settings.speed;
        sizeInput.value = settings.viewSize;
        baseViewSize = Math.max(10, parseInt(sizeInput.value, 10) || baseViewSize);
        sizeInput.value = baseViewSize;
        if (previewScaleInput && typeof settings.previewScale === 'number') {
            previewScale = Math.min(1, Math.max(0.1, settings.previewScale));
            previewScaleInput.value = previewScale.toString();
        }
        applyPreviewSize();
        loadFont(fontSelect.value);
        updateLayoutParamsVisibility();
        updateGeomParamsVisibility();
        isAnimating = animateCheckbox.checked;
        stereoCamera.eyeSep = eyeSepSlider.value / 200;
        camera.focus = parseFloat(focusSlider.value);
        camera.fov = parseInt(fovSlider.value, 10);
        camera.updateProjectionMatrix();
        regenerate();
    } catch (error) {
        console.error('Error applying settings:', error);
        alert('Could not load the settings file. It might be invalid.');
    }
}
function handleFileLoad(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { const settings = JSON.parse(e.target.result); applySettings(settings); }; reader.readAsText(file); event.target.value = ''; }
function activateObjectTab(tabName) {
    if (!objectTabButtonsContainer) return;
    const tabButtons = objectTabButtonsContainer.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content[data-tab]');
    if (!tabButtons.length || !tabContents.length) return;
    const targetTab = tabName || activeObjectTab || tabButtons[0].dataset.tab;
    if (!targetTab) return;
    activeObjectTab = targetTab;
    tabButtons.forEach(button => {
        const isActive = button.dataset.tab === targetTab;
        button.classList.toggle('active', isActive);
    });
    tabContents.forEach(content => {
        const isActive = content.dataset.tab === targetTab;
        content.classList.toggle('active', isActive);
    });
}
function setupObjectTabs() {
    if (!objectTabButtonsContainer) return;
    const tabButtons = objectTabButtonsContainer.querySelectorAll('.tab-button');
    if (!tabButtons.length) return;
    tabButtons.forEach(button => {
        button.addEventListener('click', () => activateObjectTab(button.dataset.tab));
    });
    activateObjectTab(tabButtons[0].dataset.tab);
}
function updateAutoRegenerateButton() {
    if (!toggleAutoButton) return;
    toggleAutoButton.textContent = `Auto Update: ${autoRegenerate ? 'On' : 'Off'}`;
    toggleAutoButton.classList.toggle('auto-off', !autoRegenerate);
}
function updatePendingIndicator() {
    if (!generateButton) return;
    generateButton.classList.toggle('needs-update', pendingRegenerate);
}
function requestRegenerate() {
    if (autoRegenerate) {
        pendingRegenerate = false;
        regenerate();
    } else {
        pendingRegenerate = true;
        updatePendingIndicator();
    }
}
function setupEventListeners() {
    updateAutoRegenerateButton();
    updatePendingIndicator();
    const regenControls = [ modeSelect, reflectionsEnabled, reflectionsInput, objectCountInput, effectSelect, fontSelect, reflectCheckbox, transparentCheckbox ];
    regenControls.forEach(el => el.addEventListener('change', requestRegenerate));
    document.getElementById('object-selection').addEventListener('input', () => {
        updateGeomParamsVisibility();
        requestRegenerate();
    });
    document.querySelectorAll('.params-grid input').forEach(el => el.addEventListener('input', requestRegenerate));
    document.querySelectorAll('#perStepSection input').forEach(el => el.addEventListener('input', requestRegenerate));
    document.querySelectorAll('#params-sphere-geom input, #params-box-geom input, #params-cone-geom input, #params-cylinder-geom input, #params-torus-geom input').forEach(el => el.addEventListener('input', requestRegenerate));
    generateButton.addEventListener('click', () => {
        pendingRegenerate = false;
        regenerate();
        updatePendingIndicator();
    });
    textInput.addEventListener('input', () => {
        if (modeSelect.value === 'text') requestRegenerate();
    });
    opacitySlider.addEventListener('input', () => { const opacity = parseFloat(opacitySlider.value); scene.traverse(child => { if (child.isMesh) child.material.opacity = opacity; }); if(!isAnimating) render(); });
    swapEyesButton.addEventListener('click', () => { eyesSwapped = !eyesSwapped; if(!isAnimating) render(); });
    eyeSepSlider.addEventListener('input', () => { stereoCamera.eyeSep = eyeSepSlider.value / 200; if (!isAnimating) render(); });
    focusSlider.addEventListener('input', () => { camera.focus = parseFloat(focusSlider.value); if (!isAnimating) render(); });
    fovSlider.addEventListener('input', () => { camera.fov = parseInt(fovSlider.value); camera.updateProjectionMatrix(); if (!isAnimating) render(); });
    animateCheckbox.addEventListener('change', () => isAnimating = animateCheckbox.checked);
    speedSlider.addEventListener('input', () => rotationSpeed = parseFloat(speedSlider.value));
    resizeButton.addEventListener('click', () => {
        const nextSize = parseInt(sizeInput.value, 10);
        if (!Number.isFinite(nextSize) || nextSize <= 0) {
            return;
        }
        baseViewSize = Math.max(10, nextSize);
        sizeInput.value = baseViewSize;
        applyPreviewSize();
        requestRegenerate();
    });
    if (previewScaleInput) {
        previewScaleInput.addEventListener('input', () => {
            const nextScale = parseFloat(previewScaleInput.value);
            if (!Number.isFinite(nextScale)) {
                return;
            }
            previewScale = Math.min(1, Math.max(0.1, nextScale));
            applyPreviewSize();
        });
    }
    saveButton.addEventListener('click', saveHighResPNG);
    saveSettingsButton.addEventListener('click', saveSettings);
    loadSettingsInput.addEventListener('change', handleFileLoad);
    zoomEnable.addEventListener('change', () => controls.enableZoom = zoomEnable.checked);
    panEnable.addEventListener('change', () => controls.enablePan = panEnable.checked);
    bgColorPicker.addEventListener('input', (event) => { scene.background.set(event.target.value); if (!isAnimating) render(); });
    if (startRecordingButton && stopRecordingButton) {
        startRecordingButton.addEventListener('click', startRecording);
        stopRecordingButton.addEventListener('click', stopRecording);
        updateRecordingButtons();
    }
    if (toggleAutoButton) {
        toggleAutoButton.addEventListener('click', () => {
            autoRegenerate = !autoRegenerate;
            updateAutoRegenerateButton();
            if (autoRegenerate && pendingRegenerate) {
                pendingRegenerate = false;
                regenerate();
            }
            updatePendingIndicator();
        });
    }
    collapseAllBtn.addEventListener('click', () => {
        const sections = document.querySelectorAll('details.section');
        const anyOpen = Array.from(sections).some(d => d.open);
        sections.forEach(d => d.open = !anyOpen);
    });
    effectSelect.addEventListener('change', () => {
        updateLayoutParamsVisibility();
    });
}
function saveHighResPNG() {
    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);
    const targetSize = baseViewSize;
    const highResWidth = targetSize * 4;
    const highResHeight = targetSize * 2;
    renderer.setSize(highResWidth, highResHeight, false);
    camera.aspect = (highResWidth / 2) / highResHeight;
    camera.updateProjectionMatrix();
    render();
    const link = document.createElement('a');
    link.download = 'kaleidoscope-high-res.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
    renderer.setSize(originalSize.width, originalSize.height, false);
    render();
}
function onContainerResize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    if (!isAnimating) {
        render();
    }
}
const resizeObserver = new ResizeObserver(onContainerResize);
resizeObserver.observe(container);
function updateLayoutParamsVisibility() { const effect = effectSelect.value; document.querySelectorAll('#layoutParamsSection .params-grid').forEach(el => { el.style.display = el.dataset.effect === effect ? '' : 'none'; }); }
function updateGeomParamsVisibility() {
    document.querySelectorAll('.shape-checkbox').forEach(checkbox => {
        const selectorSuffix = '[data-tab="' + checkbox.value + '"]';
        const tabButton = document.querySelector('.tab-button' + selectorSuffix);
        const tabContent = document.querySelector('.tab-content' + selectorSuffix);
        const isCurrentShape = checkbox.checked;
        if (tabButton) {
            tabButton.classList.toggle('disabled', !isCurrentShape);
        }
        if (tabContent) {
            tabContent.classList.toggle('disabled', !isCurrentShape);
        }
    });
    activateObjectTab(activeObjectTab);
}
// --- Initial Run ---
setup();
loadFont(fontSelect.value);
setupEventListeners();
setupObjectTabs();
updateLayoutParamsVisibility();
updateGeomParamsVisibility();
regenerate();
animate();
