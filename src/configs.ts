/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BikeConfig, LocationConfig, Passenger } from './types';

export const BIKES: BikeConfig[] = [
  {
    id: 'boxer_150',
    name: 'Boxer 150 (Kifaru)',
    tagline: 'The Ultimate Kenyan Workhorse',
    color: '#e63946', // Vibrant Kenyan Red
    accentColor: '#1d3557',
    maxSpeed: 15,     // standard max speed factor
    acceleration: 0.35,
    braking: 0.5,
    handling: 1.0,
    price: 0,         // Unlocked by default
    description: 'Reliable, sturdy, and well-balanced. Great for handling heavy cargo like Mama Mboga.'
  },
  {
    id: 'hlx_125',
    name: 'HLX 125 (Pika-Pika)',
    tagline: 'Lightweight & Ultra-Nimble',
    color: '#2a9d8f', // Green
    accentColor: '#e9c46a',
    maxSpeed: 17,
    acceleration: 0.55,
    braking: 0.4,
    handling: 1.4,    // Faster steer
    price: 350,
    description: 'Fast off the line and steers with razor precision. Perfect for beat-the-clock student runs.'
  },
  {
    id: 'cruiser_200',
    name: 'Cruiser 200 (Simba)',
    tagline: 'Heavy Metal King of the Highway',
    color: '#ffb703', // Yellow-Orange
    accentColor: '#fb8500',
    maxSpeed: 21,
    acceleration: 0.3,
    braking: 0.3,
    handling: 0.8,
    price: 800,
    description: 'A powerhouse motorcycle with immense top speed. Takes longer to brake, but flies like the wind.'
  }
];

export const LOCATIONS: LocationConfig[] = [
  {
    id: 'nairobi_highway',
    name: 'Nairobi Expressway',
    description: 'Smooth tarmac with tall buildings and heavy commuter traffic. Watch out for speeding cars!',
    bgColor: '#1a1c1e',
    roadColor: '#343a40',
    shoulderColor: '#1e3a1e',
    sceneryType: 'city',
    trafficDensity: 0.6,
    coinDensity: 0.8,
    potholeDensity: 0.3
  },
  {
    id: 'mombasa_road',
    name: 'Mombasa Coastal Road',
    description: 'Scenic palm trees, sandy lanes, and winding roads. Avoid fruit carts and slow tuk-tuks!',
    bgColor: '#87CEEB',
    roadColor: '#495057',
    shoulderColor: '#e9c46a', // Sand
    sceneryType: 'coast',
    trafficDensity: 0.45,
    coinDensity: 0.7,
    potholeDensity: 0.4
  },
  {
    id: 'rift_valley',
    name: 'Great Rift Valley Pass',
    description: 'Steep mountain descents, massive potholes (mashimo), and occasional stray goats crossing the road!',
    bgColor: '#2d6a4f',
    roadColor: '#2b2d42',
    shoulderColor: '#5c4033', // Brown earth
    sceneryType: 'valley',
    trafficDensity: 0.35,
    coinDensity: 0.9,
    potholeDensity: 0.8
  }
];

export const PASSENGER_TEMPLATES = [
  {
    role: 'mama',
    name: 'Mama Mboga',
    avatar: '🥬',
    dialogue: 'Harakisha mwanangu! Soko inafungwa hivi karibuni!', // "Hurry up my child! The market is closing soon!"
    weight: 1.4,   // Heavier, affects physics
    payrate: 2.0,  // Doubles your coin value
    fare: 50,
    targetDistance: 1.5 // 1.5 KM trip
  },
  {
    role: 'student',
    name: 'Mwanafunzi (Student)',
    avatar: '🎒',
    dialogue: 'Nimechelewa mtihani! Tafadhali nifikishe shule haraka!', // "I am late for exams! Please get me to school fast!"
    weight: 0.8,   // Lighter
    payrate: 1.5,  // Fast run bonus
    fare: 40,
    targetDistance: 1.2,
    timeLimit: 45 // 45 seconds
  },
  {
    role: 'mzee',
    name: 'Mzee Otieno',
    avatar: '👴',
    dialogue: 'Endesha polepole bwana. Mgongo wangu unauma.', // "Drive slowly sir. My back hurts."
    weight: 1.1,
    payrate: 1.8,
    fare: 60,
    targetDistance: 1.8,
    comfort: 100
  }
];

// Generate a random passenger with specific state
export function generateRandomPassenger(): Passenger {
  const template = PASSENGER_TEMPLATES[Math.floor(Math.random() * PASSENGER_TEMPLATES.length)];
  return {
    id: Math.random().toString(36).substring(2, 9),
    name: template.name,
    role: template.role as any,
    avatar: template.avatar,
    weight: template.weight,
    payrate: template.payrate,
    dialogue: template.dialogue,
    fare: template.fare,
    targetDistance: template.targetDistance,
    distanceTraveled: 0,
    comfort: template.comfort ?? 100,
    timeLimit: template.timeLimit
  };
}
