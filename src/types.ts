/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SteeringMode = 'tilt' | 'buttons' | 'keyboard';

export type WeatherType = 'clear' | 'rain' | 'dusty';

export interface Upgrades {
  engine: number; // Max speed / acceleration boost
  brakes: number; // Braking power
  tires: number;  // Handling / lateral speed
  tank: number;   // Fuel capacity
}

export interface BikeConfig {
  id: string;
  name: string;
  tagline: string;
  color: string;
  accentColor: string;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  handling: number;
  price: number;
  description: string;
}

export interface LocationConfig {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  roadColor: string;
  shoulderColor: string;
  sceneryType: 'city' | 'coast' | 'valley';
  trafficDensity: number;
  coinDensity: number;
  potholeDensity: number;
}

export interface Passenger {
  id: string;
  name: string;
  role: 'mama' | 'student' | 'mzee';
  avatar: string;
  weight: number; // 0.5 to 1.5 multiplier on bike physics
  payrate: number; // Coin multiplier
  dialogue: string;
  fare: number;
  targetDistance: number; // How far they need to go in KM
  distanceTraveled: number;
  comfort: number; // For Mzee, 0-100
  timeLimit?: number; // For Student
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'sedan' | 'matatu' | 'pothole' | 'goat' | 'tuktuk';
  color: string;
  damaged: boolean;
  angle?: number;
  label?: string; // e.g. "Matatu", "Shimo"
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  value: number;
  isFuel?: boolean; // Fuel jerrycan
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
}

export interface GameStats {
  coins: number;
  distance: number; // in KM
  speed: number;    // current speed in KM/H
  passengersDelivered: number;
  potholesHit: number;
  matatusDodged: number;
}

export interface UserSaveData {
  coins: number;
  ownedBikes: string[];
  activeBikeId: string;
  upgrades: Upgrades;
  highScoreDistance: number;
  highScoreCoins: number;
  completedAchievements: string[];
}
