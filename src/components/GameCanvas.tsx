/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BodaAudio } from '../audio';
import { BIKES, LOCATIONS, generateRandomPassenger } from '../configs';
import { 
  Obstacle, 
  Coin, 
  Particle, 
  Passenger, 
  SteeringMode, 
  Upgrades, 
  LocationConfig, 
  BikeConfig,
  WeatherType
} from '../types';

interface GameCanvasProps {
  activeBikeId: string;
  locationId: string;
  upgrades: Upgrades;
  steeringMode: SteeringMode;
  weather: WeatherType;
  isPaused: boolean;
  leftSteerPressed: boolean;
  rightSteerPressed: boolean;
  gasPressed: boolean;
  brakePressed: boolean;
  onGameStatsUpdate: (coins: number, km: number, speed: number) => void;
  onPassengerUpdate: (p: Passenger | null) => void;
  onTriggerWarning: (msg: string | null) => void;
  onGameOver: (finalCoins: number, distance: number, reason: string, isCrash?: boolean) => void;
  onPlaySound: (type: 'coin' | 'fuel' | 'crash' | 'success' | 'horn') => void;
  soundEnabled: boolean;
}

export default function GameCanvas({
  activeBikeId,
  locationId,
  upgrades,
  steeringMode,
  weather,
  isPaused,
  leftSteerPressed,
  rightSteerPressed,
  gasPressed,
  brakePressed,
  onGameStatsUpdate,
  onPassengerUpdate,
  onTriggerWarning,
  onGameOver,
  onPlaySound,
  soundEnabled
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // Constants
  const BIKE_Y_RATIO = 0.82; // Place bike near bottom of screen

  // Local physical states stored in Refs for instant access in loop
  const stateRef = useRef({
    bikeX: 200,
    bikeY: 500,
    bikeVx: 0,
    bikeSpeed: 0,
    bikeMaxSpeed: 15,
    bikeLean: 0,
    wheelRot: 0,
    suspensionOffset: 0,
    suspensionVelocity: 0,
    invulnTimer: 0, // frame countdown
    shakeTimer: 0,
    fuel: 100,
    maxFuel: 100,
    coinsCollectedThisRun: 0,
    distanceKm: 0,
    activePassenger: null as Passenger | null,
    stageProgress: 0, // distance since last passenger spawn or destination
    stageActive: false, // Is a roadside Boda Stage currently on-screen?
    stageX: 0,
    stageY: -300,
    stagePassenger: null as Passenger | null,
    
    // Road offsets for tiling
    roadScrollY: 0,
    sceneryScrollY: 0,
    
    // Arrays
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    particles: [] as Particle[],
  });

  // Keep track of active configuration parameters
  const bikeConfigRef = useRef<BikeConfig>(BIKES[0]);
  const locationConfigRef = useRef<LocationConfig>(LOCATIONS[0]);
  const upgradesRef = useRef<Upgrades>(upgrades);
  const steeringRef = useRef<SteeringMode>(steeringMode);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const weatherRef = useRef<WeatherType>(weather);

  // Sync inputs
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const inputState = useRef({
    left: false,
    right: false,
    gas: false,
    brake: false
  });

  // Tilt orientation ref
  const tiltRef = useRef<number>(0);

  // Update refs when props change
  useEffect(() => {
    const bike = BIKES.find(b => b.id === activeBikeId) || BIKES[0];
    const loc = LOCATIONS.find(l => l.id === locationId) || LOCATIONS[0];
    
    bikeConfigRef.current = bike;
    locationConfigRef.current = loc;
    upgradesRef.current = upgrades;
    steeringRef.current = steeringMode;
    soundEnabledRef.current = soundEnabled;
    weatherRef.current = weather;

    // Adjust max fuel capacity based on tank upgrades
    const upgradedFuelMax = 100 + upgrades.tank * 30;
    stateRef.current.maxFuel = upgradedFuelMax;
    stateRef.current.bikeMaxSpeed = bike.maxSpeed + upgrades.engine * 1.2;
  }, [activeBikeId, locationId, upgrades, steeringMode, soundEnabled, weather]);

  // Sync manual touch inputs from HUD
  useEffect(() => {
    inputState.current.left = leftSteerPressed;
    inputState.current.right = rightSteerPressed;
    inputState.current.gas = gasPressed;
    inputState.current.brake = brakePressed;
  }, [leftSteerPressed, rightSteerPressed, gasPressed, brakePressed]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Gyro tilt handlers
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (steeringRef.current !== 'tilt') return;
      
      // Gamma is left-to-right tilt in degrees (-90 to 90)
      const gamma = e.gamma || 0;
      // Map -30 to +30 degrees of tilt to -1.0 to 1.0 steering intensity
      let rawTilt = gamma / 25;
      rawTilt = Math.max(-1, Math.min(1, rawTilt));
      
      // Smooth out tilt using exponential moving average to filter accelerometer jitter
      tiltRef.current = tiltRef.current * 0.7 + rawTilt * 0.3;
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Main game loop initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling
    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      canvas.width = width;
      canvas.height = height;

      // Adjust starting position
      stateRef.current.bikeX = width / 2;
      stateRef.current.bikeY = height * BIKE_Y_RATIO;
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    resizeCanvas();

    // Spawn helper inside viewport
    const viewportWidth = () => canvas.width;
    const viewportHeight = () => canvas.height;

    // Reset loop variables
    const state = stateRef.current;
    state.fuel = 100 + upgradesRef.current.tank * 30;
    state.coinsCollectedThisRun = 0;
    state.distanceKm = 0;
    state.bikeSpeed = 0;
    state.activePassenger = null;
    state.stageProgress = 0;
    state.stageActive = false;
    state.obstacles = [];
    state.coins = [];
    state.particles = [];

    onPassengerUpdate(null);
    onGameStatsUpdate(0, 0, 0);

    // Initial item spawners
    const spawnInitialItems = () => {
      const w = viewportWidth() || 400;
      // Pre-populate some coins and cars ahead
      for (let i = 0; i < 10; i++) {
        state.coins.push({
          id: Math.random().toString(),
          x: 80 + Math.random() * (w - 160),
          y: -150 - i * 140,
          collected: false,
          value: 10
        });
      }

      for (let i = 0; i < 4; i++) {
        const types: Array<'sedan' | 'matatu' | 'tuktuk'> = ['sedan', 'matatu', 'tuktuk'];
        const colors = ['#e63946', '#2a9d8f', '#fb8500', '#f4a261', '#1d3557'];
        state.obstacles.push({
          id: Math.random().toString(),
          x: 100 + Math.random() * (w - 200),
          y: -250 - i * 320,
          width: 55,
          height: 100,
          speed: 1.5 + Math.random() * 2,
          type: types[Math.floor(Math.random() * types.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          damaged: false
        });
      }
    };

    spawnInitialItems();

    // Start engine sounds if enabled
    if (soundEnabledRef.current) {
      BodaAudio.startEngine();
    }

    // GAME UPDATE LOOP
    let lastTime = performance.now();
    let frameCount = 0;

    const gameLoop = (time: number) => {
      if (isPaused) {
        lastTime = time;
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const dt = (time - lastTime) / 1000; // delta time in seconds
      lastTime = time;
      frameCount++;

      const w = viewportWidth();
      const h = viewportHeight();

      // Ensure positions are synchronized to canvas bounds
      state.bikeY = h * BIKE_Y_RATIO;

      // 1. UPDATE PHYSICAL MOTORCYCLE PHYSICS
      const currentBikeConfig = bikeConfigRef.current;
      const currentUpgrades = upgradesRef.current;
      const currentSteeringMode = steeringRef.current;

      // Accumulate acceleration inputs
      let gasActive = inputState.current.gas || keysPressed.current['w'] || keysPressed.current['arrowup'];
      let brakeActive = inputState.current.brake || keysPressed.current['s'] || keysPressed.current['arrowdown'];

      // Apply upgrades & passenger weight modifiers
      let accelWeatherMult = 1.0;
      let brakeWeatherMult = 1.0;
      let gripWeatherMult = 1.0;

      if (weatherRef.current === 'rain') {
        brakeWeatherMult = 0.55; // 45% longer braking distance
        gripWeatherMult = 0.55;  // 45% less grip / slippery steering
      } else if (weatherRef.current === 'dusty') {
        accelWeatherMult = 0.8;  // 20% slower acceleration due to dust
        gripWeatherMult = 0.75;  // 25% less grip / loose sand steering
      }

      const accelerationFactor = (currentBikeConfig.acceleration + currentUpgrades.engine * 0.12) * accelWeatherMult;
      const brakingFactor = (currentBikeConfig.braking + currentUpgrades.brakes * 0.18) * brakeWeatherMult;
      
      const passengerWeight = state.activePassenger ? state.activePassenger.weight : 1.0;
      const adjustedAccel = (accelerationFactor / passengerWeight) * 60 * dt;
      const adjustedBrake = (brakingFactor / passengerWeight) * 120 * dt;

      if (gasActive && state.fuel > 0) {
        state.bikeSpeed += adjustedAccel;
        state.fuel -= 3.5 * dt; // Consume fuel when accelerating
      } else {
        // Friction when sliding or coasting
        state.bikeSpeed -= 1.8 * dt;
      }

      if (brakeActive) {
        state.bikeSpeed -= adjustedBrake;
      }

      // Keep passive fuel consumption going when engine is idle
      if (state.bikeSpeed > 0.1) {
        state.fuel -= 1.5 * dt;
      }

      // Clamp speed bounds
      state.bikeSpeed = Math.max(0, Math.min(state.bikeSpeed, state.bikeMaxSpeed));

      // Trigger Game Over if out of fuel and stopped
      if (state.fuel <= 0) {
        state.fuel = 0;
        if (state.bikeSpeed < 0.2) {
          BodaAudio.stopEngine();
          onGameOver(state.coinsCollectedThisRun, state.distanceKm, "PETROL IS DEPLETERD! Out of fuel on the highway!", false);
          return;
        }
        onTriggerWarning("OUT OF PETROL! GLIDING TO A STOP!");
      } else if (state.fuel < state.maxFuel * 0.25) {
        onTriggerWarning("PETROL LEVEL LOW! FIND FUEL!");
      } else if (state.invulnTimer <= 0) {
        onTriggerWarning(null); // Clear warnings
      }

      // Handle lateral steering inputs (Keyboard vs Touch buttons vs Device tilt)
      let steerValue = 0; // -1 (left) to +1 (right)
      if (currentSteeringMode === 'keyboard') {
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          steerValue = -1;
        } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          steerValue = 1;
        }
      } else if (currentSteeringMode === 'buttons') {
        if (inputState.current.left) steerValue = -1;
        if (inputState.current.right) steerValue = 1;
      } else if (currentSteeringMode === 'tilt') {
        steerValue = tiltRef.current;
      }

      // Tire upgrade boost
      const gripFactor = (1.0 + currentUpgrades.tires * 0.25) * gripWeatherMult;
      const lateralSpeed = steerValue * (currentBikeConfig.handling * gripFactor) * (3.8 + state.bikeSpeed * 0.2);

      state.bikeVx = lateralSpeed;
      state.bikeX += state.bikeVx;
      
      // Tilt lean angle
      state.bikeLean = state.bikeLean * 0.8 + (steerValue * 0.25) * 0.2;

      // Keep inside asphalt road shoulders
      const minRoadX = 55;
      const maxRoadX = w - 55;
      if (state.bikeX < minRoadX) {
        state.bikeX = minRoadX;
        state.bikeSpeed *= 0.95; // Grassy shoulder friction
      } else if (state.bikeX > maxRoadX) {
        state.bikeX = maxRoadX;
        state.bikeSpeed *= 0.95;
      }

      // Progress Distance (KM)
      const distIncrement = (state.bikeSpeed * dt) * 0.01;
      state.distanceKm += distIncrement;
      state.stageProgress += distIncrement;

      // Progress active passenger drop-off tracker
      if (state.activePassenger) {
        state.activePassenger.distanceTraveled += distIncrement;
        
        // Handle Student countdown timer
        if (state.activePassenger.role === 'student' && state.activePassenger.timeLimit !== undefined) {
          state.activePassenger.timeLimit -= dt;
          if (state.activePassenger.timeLimit <= 0) {
            // Unsuccessful fast delivery
            state.activePassenger.timeLimit = 0;
            state.activePassenger.payrate = 1.0; // Lose speed bonus
          }
        }

        // Drop-off passenger safely when distance matches target!
        if (state.activePassenger.distanceTraveled >= state.activePassenger.targetDistance) {
          const finalFare = Math.floor(state.activePassenger.fare * state.activePassenger.payrate);
          state.coinsCollectedThisRun += finalFare;
          
          if (soundEnabledRef.current) {
            BodaAudio.playSuccess();
          }

          state.activePassenger = null;
          state.stageProgress = 0; // reset to allow next stage pickup soon
          onPassengerUpdate(null);
          onTriggerWarning("SUCCESS! PASSENGER DELIVERED SAFELY!");
          
          // Flash some sparkles around dropoff
          for (let p = 0; p < 20; p++) {
            state.particles.push({
              x: state.bikeX,
              y: state.bikeY,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              color: '#10b981',
              alpha: 1.0,
              size: 4 + Math.random() * 4,
              decay: 0.02 + Math.random() * 0.02
            });
          }
        } else {
          // Sync passenger state to UI
          onPassengerUpdate({ ...state.activePassenger });
        }
      }

      // Spin tires based on speed
      state.wheelRot += (state.bikeSpeed * 0.4);

      // Decrement timers
      if (state.invulnTimer > 0) state.invulnTimer -= dt;
      if (state.shakeTimer > 0) state.shakeTimer -= dt;

      // Update Audio Engine Rumble Pitch
      if (soundEnabledRef.current) {
        BodaAudio.updateEngine(state.bikeSpeed / state.bikeMaxSpeed);
      }

      // Smooth suspension spring rebound math (for potholes bounce)
      state.suspensionVelocity += (0 - state.suspensionOffset) * 200 * dt; // Hooke's Law spring back
      state.suspensionVelocity *= Math.exp(-12 * dt); // Damping friction
      state.suspensionOffset += state.suspensionVelocity * dt;

      // Emit exhaust smoke puffs when accelerating
      if (gasActive && frameCount % 4 === 0 && state.bikeSpeed > 1) {
        state.particles.push({
          x: state.bikeX + Math.sin(state.bikeLean) * 30 + 8,
          y: state.bikeY + 32,
          vx: -state.bikeVx * 0.1 + (Math.random() - 0.5) * 1.5,
          vy: 2 + Math.random() * 3,
          color: 'rgba(200,200,200,0.4)',
          alpha: 0.5,
          size: 4 + Math.random() * 6,
          decay: 0.035 + Math.random() * 0.02
        });
      }

      // Weather ambient and wheel particles
      if (weatherRef.current === 'rain') {
        for (let r = 0; r < 3; r++) {
          state.particles.push({
            x: Math.random() * w,
            y: -15,
            vx: 1 + Math.random() * 2,
            vy: 14 + Math.random() * 8,
            color: 'rgba(156, 185, 220, 0.5)',
            alpha: 0.7,
            size: 1 + Math.random() * 1.5,
            decay: 0.012
          });
        }
        if (state.bikeSpeed > 1 && frameCount % 2 === 0) {
          state.particles.push({
            x: state.bikeX + (Math.random() - 0.5) * 6,
            y: state.bikeY + 36,
            vx: (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 3,
            color: 'rgba(255,255,255,0.4)',
            alpha: 0.5,
            size: 1.5 + Math.random() * 2,
            decay: 0.05
          });
        }
      } else if (weatherRef.current === 'dusty') {
        if (Math.random() < 0.4) {
          state.particles.push({
            x: Math.random() * w,
            y: -15,
            vx: -3 - Math.random() * 3,
            vy: 2 + Math.random() * 4,
            color: 'rgba(194, 153, 105, 0.25)',
            alpha: 0.5,
            size: 6 + Math.random() * 12,
            decay: 0.005
          });
        }
        if (state.bikeSpeed > 1 && frameCount % 3 === 0) {
          state.particles.push({
            x: state.bikeX + (Math.random() - 0.5) * 6,
            y: state.bikeY + 36,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 3,
            color: 'rgba(194, 153, 105, 0.4)',
            alpha: 0.6,
            size: 3 + Math.random() * 5,
            decay: 0.03
          });
        }
      }


      // 2. SCROLL WORLD & HANDLE TRAFFIC/OBJECTS
      state.roadScrollY = (state.roadScrollY + state.bikeSpeed) % 80;
      state.sceneryScrollY = (state.sceneryScrollY + state.bikeSpeed * 0.4) % h;

      // Move coins and trigger pickups
      state.coins.forEach((c) => {
        c.y += state.bikeSpeed;
        
        // Pick-up radius check
        if (!c.collected && Math.abs(state.bikeX - c.x) < 32 && Math.abs(state.bikeY - c.y) < 38) {
          c.collected = true;
          
          if (c.isFuel) {
            state.fuel = Math.min(state.maxFuel, state.fuel + (state.maxFuel * 0.35));
            if (soundEnabledRef.current) {
              BodaAudio.playFuel();
            }
          } else {
            // Apply passenger multiplier if any
            const mult = state.activePassenger ? state.activePassenger.payrate : 1.0;
            state.coinsCollectedThisRun += Math.ceil(c.value * mult);
            if (soundEnabledRef.current) {
              BodaAudio.playCoin();
            }
          }

          // Emit sparks
          for (let p = 0; p < 8; p++) {
            state.particles.push({
              x: c.x,
              y: c.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              color: c.isFuel ? '#fbbf24' : '#fbbf24',
              alpha: 0.9,
              size: 2.5 + Math.random() * 2.5,
              decay: 0.04
            });
          }
        }
      });

      // Filter off-screen coins and respawn ahead
      state.coins = state.coins.filter(c => c.y < h + 100);
      while (state.coins.length < 12) {
        const isFuelSpawn = Math.random() < 0.15; // 15% chance to spawn Petrol Jerrycan instead
        state.coins.push({
          id: Math.random().toString(),
          x: 75 + Math.random() * (w - 150),
          y: -100 - Math.random() * 400,
          collected: false,
          value: isFuelSpawn ? 0 : 10,
          isFuel: isFuelSpawn
        });
      }

      // Move obstacles and check collisions
      state.obstacles.forEach((ob) => {
        // Move obstacles. Potholes are static on the asphalt road, while vehicles move down slightly slower than road speed or standard speed.
        if (ob.type === 'pothole') {
          ob.y += state.bikeSpeed;
        } else {
          // Cars drive down slower, creating relative forward passing.
          // They also have some gentle lane weaving.
          ob.y += (state.bikeSpeed - ob.speed);
          if (ob.type === 'goat') {
            // Goats walk horizontally across the road!
            ob.x += ob.speed * 0.5;
            if (ob.x > w - 60 || ob.x < 60) {
              ob.speed = -ob.speed; // Bounce horizontally
            }
          }
        }

        // COLLISION VERIFICATION
        if (state.invulnTimer <= 0 && Math.abs(state.bikeX - ob.x) < (ob.width/2 + 18) && Math.abs(state.bikeY - ob.y) < (ob.height/2 + 25)) {
          if (soundEnabledRef.current) {
            BodaAudio.playCrash();
          }
          BodaAudio.stopEngine();

          let crashReason = "You crashed on the highway!";
          if (ob.type === 'pothole') {
            crashReason = "BOOM! Hit a deep pothole (shimo)! Ride over.";
          } else if (ob.type === 'goat') {
            crashReason = "CHOPAA! You hit a crossing goat!";
          } else if (ob.type === 'matatu') {
            crashReason = "WUUUT! Crashed into a reckless Matatu!";
          } else if (ob.type === 'tuktuk') {
            crashReason = "CRASH! Hit a Tuk-Tuk!";
          } else if (ob.type === 'sedan') {
            crashReason = "BAM! Smashed into a sedan!";
          }

          // Emit a burst of crash particles
          for (let p = 0; p < 25; p++) {
            state.particles.push({
              x: state.bikeX,
              y: state.bikeY,
              vx: (Math.random() - 0.5) * 14,
              vy: (Math.random() - 0.5) * 14,
              color: ob.type === 'pothole' ? '#5c4033' : (ob.color || '#ef4444'),
              alpha: 1.0,
              size: 4 + Math.random() * 6,
              decay: 0.02 + Math.random() * 0.02
            });
          }

          onGameOver(state.coinsCollectedThisRun, state.distanceKm, crashReason, true);
          return;
        }
      });

      // Filter off-screen obstacles and respawn ahead
      state.obstacles = state.obstacles.filter(ob => ob.y < h + 200);
      while (state.obstacles.length < 5) {
        const obstacleTypes: Array<'sedan' | 'matatu' | 'pothole' | 'goat' | 'tuktuk'> = ['sedan', 'matatu', 'pothole', 'goat', 'tuktuk'];
        const chosenType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        // Custom dimensions
        let obW = 55;
        let obH = 95;
        if (chosenType === 'matatu') {
          obW = 65;
          obH = 130;
        } else if (chosenType === 'pothole') {
          obW = 50;
          obH = 30;
        } else if (chosenType === 'goat') {
          obW = 35;
          obH = 35;
        } else if (chosenType === 'tuktuk') {
          obW = 45;
          obH = 70;
        }

        const colors = ['#e63946', '#2a9d8f', '#fb8500', '#1d3557', '#d62828', '#fcbf49'];
        state.obstacles.push({
          id: Math.random().toString(),
          x: 75 + Math.random() * (w - 150),
          y: -150 - Math.random() * 500,
          width: obW,
          height: obH,
          speed: chosenType === 'pothole' ? 0 : 1.0 + Math.random() * 3,
          type: chosenType,
          color: colors[Math.floor(Math.random() * colors.length)],
          damaged: false
        });
      }


      // 3. BODA STAGE / PASSENGER PICKUP STATION TRIGGER
      // If we don't have a passenger active, and have traveled enough progress, spawn a Boda Stage passenger shelter.
      if (!state.activePassenger && state.stageProgress > 0.6 && !state.stageActive) {
        state.stageActive = true;
        state.stageY = -200;
        state.stageX = w - 60; // place shelter on right road shoulder
        state.stagePassenger = generateRandomPassenger();
      }

      if (state.stageActive) {
        state.stageY += state.bikeSpeed;

        // Alignment check: Rider must slow down to absolute stop/slow speed next to Boda Stage to pick up!
        if (state.stageY > state.bikeY - 90 && state.stageY < state.bikeY + 90) {
          if (state.bikeSpeed < 2.0) {
            // PICK UP THE PASSENGER!
            state.activePassenger = state.stagePassenger;
            state.stageActive = false;
            state.stageProgress = 0; // Reset progress
            
            if (soundEnabledRef.current) {
              BodaAudio.playCoin(); // pick up trigger
            }

            onTriggerWarning(`PICKED UP ${state.activePassenger?.name.toUpperCase()}!`);
            onPassengerUpdate({ ...state.activePassenger } as Passenger);

            // Play passenger dialog sparkle
            for (let p = 0; p < 12; p++) {
              state.particles.push({
                x: state.stageX,
                y: state.stageY,
                vx: -2 - Math.random() * 5,
                vy: (Math.random() - 0.5) * 4,
                color: '#60a5fa',
                alpha: 1.0,
                size: 3 + Math.random() * 3,
                decay: 0.04
              });
            }
          } else {
            // Flash a reminder to slow down!
            onTriggerWarning("SLOW DOWN BELOW 5 KM/H TO PICK UP PASSENGER!");
          }
        }

        // Dismiss if scrolled past without pick-up
        if (state.stageY > h + 200) {
          state.stageActive = false;
          state.stageProgress = 0.2; // reset slightly to spawn next stage soon
        }
      }


      // 4. ANIMATE PARTICLES
      state.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      state.particles = state.particles.filter(p => p.alpha > 0);


      // 5. RENDER CANVAS SCENE
      ctx.clearRect(0, 0, w, h);

      // A. ROAD SHOULDERS BACKGROUNDS (based on locations)
      const currentLoc = locationConfigRef.current;
      ctx.fillStyle = currentLoc.shoulderColor;
      ctx.fillRect(0, 0, w, h);

      // Draw landscape details depending on environment
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      if (currentLoc.sceneryType === 'coast') {
        // Coastal sandy textures & palms borders
        ctx.fillStyle = '#e9c46a';
        ctx.fillRect(0, 0, 40, h);
        ctx.fillRect(w - 40, 0, 40, h);
      }

      // B. ASPHALT HIGHWAY CENTER
      const roadWidth = w - 100;
      ctx.fillStyle = currentLoc.roadColor;
      ctx.fillRect(50, 0, roadWidth, h);

      // White borders
      ctx.fillStyle = '#fff';
      ctx.fillRect(50, 0, 4, h);
      ctx.fillRect(w - 54, 0, 4, h);

      // Moving Dashed white lanes in the middle
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 4;
      ctx.setLineDash([30, 45]);
      ctx.beginPath();
      ctx.moveTo(w / 2, state.roadScrollY - 80);
      ctx.lineTo(w / 2, h + 80);
      ctx.stroke();
      ctx.setLineDash([]);


      // C. RENDER ROADSIDE SCENERY ACCENTS
      // Draw static trees/kiosks scrolling past
      ctx.fillStyle = '#10b981'; // Green canopy
      // Custom green/yellow/red circles simulating trees or Safaricom M-Pesa booths
      ctx.fillStyle = '#15803d';
      
      // Let's procedurally draw cool Kenyan roadside M-Pesa kiosks & signs
      ctx.fillStyle = '#22c55e'; // Green M-Pesa brand color
      const sceneryOffset = state.sceneryScrollY;
      
      // Right-side kiosk
      ctx.fillRect(w - 42, sceneryOffset - 100, 30, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('M-PESA', w - 40, sceneryOffset - 85);

      // Left-side banana tree
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(25, sceneryOffset + h/3, 14, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#854d0e'; // Trunk
      ctx.fillRect(23, sceneryOffset + h/3 + 8, 4, 15);


      // D. RENDER BODA STAGE SHELTER
      if (state.stageActive) {
        ctx.save();
        ctx.translate(state.stageX, state.stageY);
        
        // Shelter structure
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-35, -45, 45, 55); // Main hut
        ctx.fillStyle = '#ef4444'; // Red roof
        ctx.beginPath();
        ctx.moveTo(-42, -45);
        ctx.lineTo(-12, -70);
        ctx.lineTo(15, -45);
        ctx.closePath();
        ctx.fill();

        // Boda Stage Sign board
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-30, -35, 35, 12);
        ctx.fillStyle = '#000';
        ctx.font = 'black 8px sans-serif';
        ctx.fillText('STAGE', -26, -26);

        // Draw waiting passenger at the stage shelter
        if (state.stagePassenger) {
          ctx.font = '22px Arial';
          ctx.fillText(state.stagePassenger.avatar, -20, 5);
        }

        ctx.restore();
      }


      // E. DRAW POTHOLES AND OTHER OBSTACLES
      state.obstacles.forEach((ob) => {
        ctx.save();
        ctx.translate(ob.x, ob.y);

        if (ob.type === 'pothole') {
          // Asphalt road cracks crater
          ctx.fillStyle = '#1e1b18'; // Dark earth inside
          ctx.beginPath();
          ctx.arc(0, 0, ob.width/2, 0, Math.PI * 2);
          ctx.fill();

          // Outer cracked border
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, ob.width/2 + 2, 0, Math.PI * 2);
          ctx.stroke();

          // Pothole mud puddle highlight
          ctx.fillStyle = '#5c4033';
          ctx.beginPath();
          ctx.ellipse(-2, -1, ob.width/3, ob.width/5, 0.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('SHIMO', -13, 2);
        } else if (ob.type === 'goat') {
          // Procedurally draw a cute crossing white/black goat
          ctx.fillStyle = '#fff';
          ctx.fillRect(-15, -10, 30, 16); // Body
          ctx.fillRect(-12, 5, 4, 10); // Left legs
          ctx.fillRect(8, 5, 4, 10); // Right legs
          ctx.fillRect(-22, -18, 10, 12); // Neck/head
          ctx.fillStyle = '#000';
          ctx.fillRect(-20, -14, 2, 2); // Eye
          
          ctx.strokeStyle = '#374151'; // horns
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-16, -18);
          ctx.lineTo(-18, -25);
          ctx.stroke();
        } else if (ob.type === 'matatu') {
          // THE FAMOUS KENYAN GRAFFITI MATATU MINI-BUS
          // Car chassis body
          ctx.fillStyle = ob.color;
          ctx.fillRect(-ob.width/2, -ob.height/2, ob.width, ob.height);

          // Cool sports decals stripes (Kenyan flag colors on side!)
          ctx.fillStyle = '#000';
          ctx.fillRect(-ob.width/2, -5, ob.width, 10);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-ob.width/2, -15, ob.width, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-ob.width/2, 11, ob.width, 4);

          // Windshield windows
          ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
          ctx.fillRect(-ob.width/2 + 6, -ob.height/2 + 10, ob.width - 12, 22); // Front windshield
          ctx.fillRect(-ob.width/2 + 6, 20, ob.width - 12, 35); // Passenger windows

          // Windshield name board (Classic matatu culture lettering!)
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-ob.width/2 + 10, -ob.height/2 + 3, ob.width - 20, 8);
          ctx.fillStyle = '#000';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('NXR PRO', 0, -ob.height/2 + 10);

          // Headlights
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(-ob.width/2 + 8, -ob.height/2 + 3, 5, 0, Math.PI * 2);
          ctx.arc(ob.width/2 - 8, -ob.height/2 + 3, 5, 0, Math.PI * 2);
          ctx.fill();

          // Tires/Wheels
          ctx.fillStyle = '#111';
          ctx.fillRect(-ob.width/2 - 3, -ob.height/3, 4, 20);
          ctx.fillRect(ob.width/2 - 1, -ob.height/3, 4, 20);
          ctx.fillRect(-ob.width/2 - 3, ob.height/3, 4, 20);
          ctx.fillRect(ob.width/2 - 1, ob.height/3, 4, 20);
        } else {
          // STANDARD TRAFFIC CARS (sedans, tuk-tuks)
          ctx.fillStyle = ob.color;
          ctx.fillRect(-ob.width/2, -ob.height/2, ob.width, ob.height);

          // Windshields
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(-ob.width/2 + 6, -ob.height/2 + 10, ob.width - 12, 16);
          ctx.fillRect(-ob.width/2 + 6, ob.height/2 - 25, ob.width - 12, 16);

          // Wheel fenders
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-ob.width/2 - 2, -ob.height/4, 3, 16);
          ctx.fillRect(ob.width/2 - 1, -ob.height/4, 3, 16);
        }

        ctx.restore();
      });


      // F. DRAW SHINY SPINNING COINS & FUEL JERRYCANS
      state.coins.forEach((c) => {
        if (c.collected) return;
        
        ctx.save();
        ctx.translate(c.x, c.y);

        if (c.isFuel) {
          // Draw a bright yellow Jerrycan/Petrol container
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(-10, -8, 20, 20); // main container
          ctx.fillRect(-7, -13, 14, 5); // nozzle neck
          ctx.fillStyle = '#000';
          ctx.fillRect(-5, -3, 10, 10);
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText('P', -3, 5);
          
          // Outer glowing aura
          ctx.strokeStyle = 'rgba(251,191,36,0.3)';
          ctx.lineWidth = 3;
          ctx.strokeRect(-12, -15, 24, 29);
        } else {
          // Shiny Gold Coin
          const pulse = 1 + Math.sin(time * 0.01) * 0.1;
          ctx.fillStyle = '#fbbf24'; // Amber Gold
          ctx.beginPath();
          ctx.arc(0, 0, 11 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Inner ridge
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
          ctx.stroke();

          // KES Currency Symbol
          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('$', 0, 3.5);
        }

        ctx.restore();
      });


      // G. DRAW PARTICLES
      state.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });


      // H. THE DYNAMIC BODA BODA RIDER & MOTORCYCLE
      // Apply blink effect if invulnerable after a crash
      const isVisible = state.invulnTimer <= 0 || Math.floor(time / 100) % 2 === 0;
      
      if (isVisible) {
        ctx.save();
        // Shake screen if shaker is active
        let shakeOffset = 0;
        if (state.shakeTimer > 0) {
          shakeOffset = (Math.random() - 0.5) * 10;
        }

        // Apply suspension offset & horizontal lean
        ctx.translate(state.bikeX + shakeOffset, state.bikeY + state.suspensionOffset);
        ctx.rotate(state.bikeLean);

        // --- 0. DYNAMIC HEADLIGHT GLOW BEAM ---
        ctx.save();
        const lightGrad = ctx.createLinearGradient(0, -38, 0, -180);
        lightGrad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
        lightGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.2)');
        lightGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(0, -38); // Headlight origin
        ctx.lineTo(-65, -180); // top-left
        ctx.lineTo(65, -180);  // top-right
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // --- 1. WHEELS (TOP-DOWN ALIGNED VERTICALLY) ---
        // Front Wheel (centered at 0, -35)
        ctx.fillStyle = '#0f172a'; // Deep tyre black
        ctx.beginPath();
        ctx.roundRect(-4.5, -45, 9, 20, [3]);
        ctx.fill();
        // Inner silver alloy rim
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(0, -28);
        ctx.stroke();

        // Rear Wheel (centered at 0, 35)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-5.5, 25, 11, 22, [3]);
        ctx.fill();
        // Rear mudflap with Kenyan BODA yellow lettering
        ctx.fillStyle = '#111827';
        ctx.fillRect(-6.5, 47, 13, 3);
        ctx.fillStyle = '#fbbf24'; // Yellow
        ctx.font = 'bold 5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BODA', 0, 50.5);

        // --- 2. CHROME CRASH GUARDS & EXHAUST SYSTEM ---
        // Side leg crash guards (symmetrical left & right)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -18);
        ctx.lineTo(-17, -12);
        ctx.lineTo(-11, 2);
        ctx.lineTo(-5, -2);
        ctx.moveTo(6, -18);
        ctx.lineTo(17, -12);
        ctx.lineTo(11, 2);
        ctx.lineTo(5, -2);
        ctx.stroke();

        // Boxer side engine cylinder heads (pointing outwards horizontally)
        ctx.fillStyle = '#4b5563'; // Silver metal crank block
        ctx.fillRect(-15, -10, 30, 8);
        ctx.fillStyle = '#111827'; // Cylinder black fins
        ctx.fillRect(-17, -9, 4, 6);
        ctx.fillRect(13, -9, 4, 6);
        // Red ignition wires
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-17, -6);
        ctx.lineTo(-10, -6);
        ctx.moveTo(17, -6);
        ctx.lineTo(10, -6);
        ctx.stroke();

        // Chrome exhaust silencer pipe (running down the right side)
        ctx.fillStyle = '#cbd5e1'; // Chrome
        ctx.fillRect(6.5, 12, 4.5, 26);
        ctx.fillStyle = '#1e293b'; // Heat shield guard on exhaust
        ctx.fillRect(7, 18, 4, 12);
        ctx.fillStyle = '#111827'; // Black tip pipe hole
        ctx.beginPath();
        ctx.arc(8.75, 38, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // --- 3. HANDLEBARS & DUAL SIDE MIRRORS ---
        ctx.strokeStyle = '#1e293b'; // Handlebars bar
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, -25);
        ctx.lineTo(18, -25);
        ctx.stroke();
        // Rubber handle grips
        ctx.fillStyle = '#000000';
        ctx.fillRect(-19.5, -26.5, 4.5, 3);
        ctx.fillRect(15, -26.5, 4.5, 3);

        // Side mirrors (extending diagonally forward-left and forward-right)
        ctx.strokeStyle = '#9ca3af'; // Chrome stems
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-12, -25);
        ctx.lineTo(-21, -33);
        ctx.moveTo(12, -25);
        ctx.lineTo(21, -33);
        ctx.stroke();
        // Mirror oval glass
        ctx.fillStyle = '#94a3b8'; // Shiny glass blue-grey
        ctx.beginPath();
        ctx.ellipse(-21, -33, 4, 2.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(21, -33, 4, 2.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- 4. CHASSIS FAIRINGS, TANK, AND SEAT ---
        // Main bike colored chassis fairing strip
        ctx.fillStyle = currentBikeConfig.color;
        ctx.beginPath();
        ctx.roundRect(-5.5, -25, 11, 48, [3]);
        ctx.fill();

        // Fuel Tank (Teardrop shape viewed from above)
        ctx.fillStyle = currentBikeConfig.color;
        ctx.beginPath();
        ctx.ellipse(0, -13, 8.5, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Fuel filler cap
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, -18, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Kenyan Flag Decal Sticker on the tank top!
        ctx.fillStyle = '#000000'; // Black strip
        ctx.fillRect(-3.5, -11, 7, 1);
        ctx.fillStyle = '#ef4444'; // Red strip
        ctx.fillRect(-3.5, -10, 7, 1);
        ctx.fillStyle = '#22c55e'; // Green strip
        ctx.fillRect(-3.5, -9, 7, 1);

        // Long comfortable leather seat
        ctx.fillStyle = '#1e293b'; // Charcoal leather
        ctx.beginPath();
        ctx.roundRect(-5, -2, 10, 26, [3]);
        ctx.fill();
        // Stitch lines on leather
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, 11);
        ctx.lineTo(5, 11);
        ctx.stroke();

        // Rear yellow license plate pointing backwards
        ctx.fillStyle = '#fbbf24'; // Kenyan yellow plate
        ctx.fillRect(-6, 42, 12, 5);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-6, 42, 12, 5);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 4px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KMDR 150', 0, 46);

        // --- 5. PILOT BODA RIDER (VIEWED FROM ABOVE) ---
        // Shoulders & Torso wearing fluorescent lime Reflector Vest
        ctx.fillStyle = '#84cc16'; // Neon green reflector
        ctx.beginPath();
        ctx.roundRect(-8, -2, 16, 12, [4]);
        ctx.fill();
        // Silver reflective vertical vest stripes
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-5, -2, 2, 12);
        ctx.fillRect(3, -2, 2, 12);

        // Hands/Arms reaching forward to handlebars grips
        ctx.strokeStyle = '#1e293b'; // Leather jacket sleeves
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-7.5, 2);
        ctx.lineTo(-17, -24); // Left arm
        ctx.moveTo(7.5, 2);
        ctx.lineTo(17, -24);  // Right arm
        ctx.stroke();

        // Round helmet viewed from above
        ctx.fillStyle = '#ef4444'; // Safety helmet red/yellow
        ctx.beginPath();
        ctx.arc(0, -1, 6.5, 0, Math.PI * 2);
        ctx.fill();
        // Shiny visor glass at the front (facing UP / forward)
        ctx.fillStyle = '#0f172a'; // Shiny black/dark blue visor
        ctx.beginPath();
        ctx.arc(0, -1, 6.5, -Math.PI * 0.9, -Math.PI * 0.1);
        ctx.closePath();
        ctx.fill();

        // --- 6. ACTIVE PASSENGER SEATED ON THE PILLION ---
        if (state.activePassenger) {
          ctx.save();
          // Sit slightly behind the pilot rider (pillion seat)
          ctx.translate(0, 16);

          if (state.activePassenger.role === 'mama') {
            // Mama Mboga wearing a colorful traditional kanga/leso wrap
            ctx.fillStyle = '#f97316'; // Bright orange leso
            ctx.beginPath();
            ctx.ellipse(0, 2, 7.5, 7.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head turban wrap viewed from above
            ctx.fillStyle = '#3b82f6'; // Royal blue turban
            ctx.beginPath();
            ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
            ctx.fill();

            // Sacks of Mboga / cabbage / potatoes loaded on side panniers & rack
            ctx.fillStyle = '#15803d'; // Green leaf bag
            ctx.beginPath();
            ctx.arc(-11, 1, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '8px sans-serif';
            ctx.fillText('🥬', -15, 4);

            ctx.fillStyle = '#854d0e'; // Brown gunny potato sack on right side
            ctx.beginPath();
            ctx.arc(11, 1, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.font = '7px sans-serif';
            ctx.fillText('🥔', 8, 3);

          } else if (state.activePassenger.role === 'student') {
            // Student with blue school sweater and bright red school backpack
            ctx.fillStyle = '#3b82f6'; // Blue sweater
            ctx.beginPath();
            ctx.ellipse(0, 2, 6.5, 6.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // School backpack on student's back (facing backwards, i.e., downwards)
            ctx.fillStyle = '#ef4444'; // Red backpack
            ctx.beginPath();
            ctx.roundRect(-4.5, 4, 9, 6, [2]);
            ctx.fill();

            // Peach skin color student head with green cap
            ctx.fillStyle = '#fbcfe8'; // Skin
            ctx.beginPath();
            ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#22c55e'; // Green cap
            ctx.beginPath();
            ctx.arc(0, -1, 4.8, -Math.PI, 0);
            ctx.fill();

          } else if (state.activePassenger.role === 'mzee') {
            // Mzee Otieno with white traditional robe and white kofia cap
            ctx.fillStyle = '#e2e8f0'; // White traditional robe
            ctx.beginPath();
            ctx.ellipse(0, 2, 7, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Head with white/gold kofia cap viewed from above
            ctx.fillStyle = '#ffffff'; // White kofia
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fbbf24'; // Gold crown embroidery line
            ctx.lineWidth = 1;
            ctx.stroke();

            // Mzee's brown wooden walking stick held on his side
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(-10, -4);
            ctx.lineTo(-10, 10);
            ctx.lineTo(-13, 11); // curved handle crook
            ctx.stroke();
          }

          ctx.restore();
        }

        ctx.restore();
      }

      // Ambient Weather color tints
      if (weatherRef.current === 'rain') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'; // cool dark rain blue-slate tint
        ctx.fillRect(0, 0, w, h);
      } else if (weatherRef.current === 'dusty') {
        ctx.fillStyle = 'rgba(120, 85, 45, 0.14)'; // warm dusty sand brown-beige tint
        ctx.fillRect(0, 0, w, h);
      }

      // Sync data changes back to parent React component periodically (~every 5 frames)
      if (frameCount % 6 === 0) {
        onGameStatsUpdate(state.coinsCollectedThisRun, state.distanceKm, state.bikeSpeed);
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      BodaAudio.stopEngine();
    };
  }, [isPaused]);

  // Handle horn sound triggered by click
  const handleTriggerHorn = () => {
    if (soundEnabledRef.current) {
      BodaAudio.playHorn();
    }
    onPlaySound('horn');
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-zinc-950">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
