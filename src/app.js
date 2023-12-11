// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Loader } from '@googlemaps/js-api-loader';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import { CatmullRomCurve3, Vector3 } from 'three';

import CAR_MODEL_URL from '../assets/lowpoly-sedan.glb';
const CAR_FRONT = new Vector3(0, 1, 0);

let map; // Your map variable

const apiOptions = {
  apiKey: 'your api key',
  version: 'beta',
};

const VIEW_PARAMS = {
  center: { lat: 46.511033, lng: -87.767402 },
  zoom: 18,
  heading: 40,
  tilt: 65,
};

const mapOptions = {
  zoom: 18,
  disableDefaultUI: true,
  heading: 25,
  tilt: 60,
  mapTypeId: 'satellite',
  center: { lat: 46.511033, lng: -87.767402 },
  mapId: 'your map id',
};

const ANIMATION_DURATION = 12000;
const ANIMATION_POINTS = [
  { lat: 46.511033, lng: -87.767402 }, // Origin point
  { lat: 46.512533, lng: -87.767402 }, // Move north (10 times the distance)
  { lat: 46.512533, lng: -87.778402 }, // Move east (10 times the distance)
  { lat: 46.511033, lng: -87.778402 }, // Move south (10 times the distance)
  { lat: 46.511033, lng: -87.767402 }, // Back to the starting point
];

// Vector for car's front direction
const tmpVec3 = new Vector3();

async function createCarModel() {
  const carModel = await loadCarModel();
  carModel.scale.setScalar(3);
  carModel.rotation.set(Math.PI / 2, 0, Math.PI, 'ZXY');
  return carModel;
}
const cars = [];

async function main() {
  // Initialize the map
  const map = await initMap();

  // Create the Three.js overlay view and scene
  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  const scene = overlay.getScene();

  // Set the map in the overlay view
  overlay.setMap(map);

  // Create a Catmull-Rom spline from the points for animation
  const points = ANIMATION_POINTS.map((p) => overlay.latLngAltToVector3(p));
  const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.2);
  curve.updateArcLengths();

  // Create track line based on the curve and add it to the scene
  const trackLine = createTrackLine(curve);
  scene.add(trackLine);
  // Load a single car model
  const singleCarModel = await createCarModel();

  // Create and add 400 cars to the scene
  for (let i = 0; i < 10; i++) {
    const car = singleCarModel.clone();
    scene.add(car);
    cars.push(car);
    // Position each car slightly differently to prevent overlap
    car.position.set(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1);
  }
  // Start animation loop
  overlay.update = () => {
    // Get the viewport size and update track line material resolution
    trackLine.material.resolution.copy(overlay.getViewportSize());

    // Calculate animation progress based on time
    const animationProgress = (performance.now() % ANIMATION_DURATION) / ANIMATION_DURATION;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const offset = i / cars.length; // Apply an offset to each car along the curve

      updateCarOnCurve(animationProgress, car, curve, offset);
    }

    // Request redraw for the scene
    overlay.requestRedraw();
  };
}

function updateCarOnCurve(animationProgress, car, curve, offset = 0) {
  curve.getPointAt((animationProgress + offset) % 1, car.position);
  curve.getTangentAt((animationProgress + offset) % 1, tmpVec3);
  car.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);
}

async function initMap() {
  const mapDiv = document.getElementById('map');
  const apiLoader = new Loader(apiOptions);
  await apiLoader.load();
  map = new google.maps.Map(mapDiv, mapOptions);
  return map;
}

function createTrackLine(curve) {
  const numPoints = 10 * curve.points.length;
  const curvePoints = curve.getSpacedPoints(numPoints);
  const positions = new Float32Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    curvePoints[i].toArray(positions, 3 * i);
  }

  const trackLine = new Line2(
    new LineGeometry(),
    new LineMaterial({
      color: 0x0f9d58,
      linewidth: 5,
    })
  );

  trackLine.geometry.setPositions(positions);

  return trackLine;
}
/**
 * Load and prepare the car-model for animation.
 */
async function loadCarModel() {
  const loader = new GLTFLoader();

  return new Promise((resolve) => {
    loader.load(CAR_MODEL_URL, (gltf) => {
      const group = gltf.scene;
      const carModel = group.getObjectByName('sedan');

      carModel.scale.setScalar(3);
      carModel.rotation.set(Math.PI / 2, 0, Math.PI, 'ZXY');

      resolve(group);
    });
  });
}

main().catch((err) => console.error(err));
