import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
// THREE.ColorManagement.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
// material.map.colorSpace = THREE.SRGBColorSpace;
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
  // alphaTest: 0.3,
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({numStars: 2000});
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

// Adicionando satélites
const satelliteGroup = new THREE.Group();
scene.add(satelliteGroup);

const satelliteGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 }); // Cinza

const numSatellites = 5;
const satelliteDistance = 1.5;

const satellites = [];

for (let i = 0; i < numSatellites; i++) {
  const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
  const angle = (i / numSatellites) * Math.PI * 2;
  satellite.position.set(
    Math.cos(angle) * satelliteDistance,
    Math.sin(angle) * satelliteDistance,
    0
  );
  satelliteGroup.add(satellite);
  satellites.push(satellite);
}

// Função para criar o sinal de comunicação
function createSignal(start, end) {
  const signalGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    start.x, start.y, start.z,
    end.x, end.y, end.z
  ]);
  signalGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const signalMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const signal = new THREE.Line(signalGeometry, signalMaterial);
  scene.add(signal);
  return signal;
}

let signals = [];
let signalProgress = 0;
const signalSpeed = 0.02;

// Inicializar sinais de comunicação entre todos os pares de satélites
for (let i = 0; i < satellites.length; i++) {
  for (let j = i + 1; j < satellites.length; j++) {
    const start = satellites[i].position.clone().applyMatrix4(satelliteGroup.matrixWorld);
    const end = satellites[j].position.clone().applyMatrix4(satelliteGroup.matrixWorld);
    signals.push(createSignal(start, end));
  }
}

function animate() {
  requestAnimationFrame(animate);

  earthMesh.rotation.y += 0.002;
  lightsMesh.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.0023;
  glowMesh.rotation.y += 0.002;
  stars.rotation.y -= 0.0002;

  // Animar satélites
  satelliteGroup.rotation.y += 0.01;

  // Atualizar sinais de comunicação
  signalProgress += signalSpeed;
  if (signalProgress >= 1) {
    signalProgress = 0;
  }

  signals.forEach((signal, index) => {
    const start = satellites[Math.floor(index / (satellites.length - 1))].position.clone().applyMatrix4(satelliteGroup.matrixWorld);
    const end = satellites[(index % (satellites.length - 1)) + 1].position.clone().applyMatrix4(satelliteGroup.matrixWorld);
    const currentPos = start.clone().lerp(end, signalProgress);
    const vertices = new Float32Array([
      start.x, start.y, start.z,
      currentPos.x, currentPos.y, currentPos.z
    ]);
    signal.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  });

  renderer.render(scene, camera);
}

animate();

function handleWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);