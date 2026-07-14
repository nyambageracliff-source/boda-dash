/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Settings, 
  Award, 
  MapPin, 
  Wrench, 
  CircleAlert, 
  Zap, 
  Disc, 
  Gauge, 
  Compass, 
  ShieldCheck, 
  Bike,
  Coins,
  History,
  Volume2,
  VolumeX,
  Keyboard,
  Smartphone,
  CheckCircle,
  TrendingUp,
  CloudRain
} from 'lucide-react';
import { BIKES, LOCATIONS } from '../configs';
import { SteeringMode, Upgrades, UserSaveData, BikeConfig, WeatherType } from '../types';

interface MenuProps {
  saveData: UserSaveData;
  selectedLocationId: string;
  onSelectLocation: (id: string) => void;
  steeringMode: SteeringMode;
  onSelectSteeringMode: (mode: SteeringMode) => void;
  weather: WeatherType;
  onSelectWeather: (w: WeatherType) => void;
  onUpgrade: (type: keyof Upgrades) => void;
  onPurchaseBike: (bikeId: string, price: number) => void;
  onSelectBike: (bikeId: string) => void;
  onStartGame: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function Menu({
  saveData,
  selectedLocationId,
  onSelectLocation,
  steeringMode,
  onSelectSteeringMode,
  weather,
  onSelectWeather,
  onUpgrade,
  onPurchaseBike,
  onSelectBike,
  onStartGame,
  soundEnabled,
  onToggleSound
}: MenuProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'garage' | 'locations' | 'stats'>('main');

  const activeBike = BIKES.find(b => b.id === saveData.activeBikeId) || BIKES[0];
  const currentLocation = LOCATIONS.find(l => l.id === selectedLocationId) || LOCATIONS[0];

  // Calculate upgrade costs
  const getUpgradeCost = (type: keyof Upgrades) => {
    const currentLevel = saveData.upgrades[type];
    if (currentLevel >= 5) return Infinity; // Max level 5
    return 80 + currentLevel * 120;
  };

  // Helper to draw custom stat bars
  const renderStatBar = (label: string, value: number, color: string, icon: React.ReactNode) => {
    return (
      <div className="mb-3">
        <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            {icon}
            {label}
          </span>
          <span className="font-mono font-bold text-zinc-200">{value}/5</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(value / 5) * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  };

  // List of achievements we can show
  const ACHIEVEMENTS = [
    { id: 'first_ride', title: 'Stage 1 Complete', desc: 'Deliver your first passenger safely', icon: '🟢' },
    { id: 'coin_hunter', title: 'Chapaa Master', desc: 'Collect 100 coins in a single ride', icon: '💰' },
    { id: 'pothole_survivor', title: 'Shock Absorber Pro', desc: 'Survive hitting 5 potholes in one run', icon: '🕳️' },
    { id: 'distance_pro', title: 'Long Distance Rider', desc: 'Ride more than 5.0 KM total', icon: '📍' },
    { id: 'matatu_ninja', title: 'Matatu Ninja', desc: 'Dodge 15 matatus without crashing', icon: '🚌' }
  ];

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col overflow-y-auto font-sans">
      {/* KENYAN FLAG ACCENT TOP BAR */}
      <div className="h-2.5 w-full flex">
        <div className="bg-black h-full flex-1" />
        <div className="bg-red-600 h-full flex-1" />
        <div className="bg-green-600 h-full flex-1" />
      </div>

      {/* HEADER SECTION */}
      <header className="p-4 flex justify-between items-center bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/10 rounded-lg border border-red-500/20 text-red-500">
            <Bike className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              REAL BODA <span className="text-red-500 font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-xs">RIDER KE</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-1.5 flex-wrap">
              The Streets of Kenya Simulator
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[8px] font-black tracking-normal normal-case">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> 100% Offline Mode
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button 
            onClick={onToggleSound}
            className="p-2.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition border border-zinc-700/50 text-zinc-300"
            title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
          </button>

          {/* Coin status bar */}
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3.5 py-1.5 font-mono text-amber-400 shadow-sm shadow-amber-500/5">
            <Coins className="w-4 h-4 animate-bounce" />
            <span className="font-bold text-sm tracking-wide">{saveData.coins}</span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-grow flex flex-col justify-center space-y-6 py-6"
            >
              {/* BRAND IMAGE BANNER */}
              <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-800 p-6 shadow-xl overflow-hidden flex flex-col justify-end min-h-[160px]">
                {/* Visual decoration overlay */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f87171_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
                <div className="absolute right-6 top-6 opacity-20 text-zinc-600">
                  <Compass className="w-32 h-32" />
                </div>
                
                <div className="relative z-10">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-red-600 rounded-full text-white inline-block mb-3">
                    Active Boda
                  </span>
                  <h2 className="text-2xl font-black tracking-tight">{activeBike.name}</h2>
                  <p className="text-xs text-zinc-400 font-mono italic mt-1">{activeBike.tagline}</p>
                </div>
              </div>

              {/* ACTION STATS PREVIEW */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setActiveTab('locations')} 
                  className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-all p-4 rounded-xl cursor-pointer flex flex-col justify-between"
                >
                  <span className="text-zinc-500 text-xs font-semibold tracking-wider uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Route
                  </span>
                  <div className="mt-2">
                    <div className="font-bold text-sm text-white truncate">{currentLocation.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">Change highway route</div>
                  </div>
                </div>

                <div 
                  onClick={() => setActiveTab('garage')} 
                  className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-all p-4 rounded-xl cursor-pointer flex flex-col justify-between"
                >
                  <span className="text-zinc-500 text-xs font-semibold tracking-wider uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-zinc-400" /> Tuning
                  </span>
                  <div className="mt-2">
                    <div className="font-bold text-sm text-white">Garage & Parts</div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">Upgrade engine & brakes</div>
                  </div>
                </div>
              </div>

              {/* INPUT STEERING CONTROLLER METHOD */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Settings className="w-4 h-4" /> Steering Interface
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tilt', label: 'Phone Tilt', icon: <Smartphone className="w-4 h-4" />, desc: 'Gyro steering' },
                    { id: 'buttons', label: 'On-Screen', icon: <Smartphone className="w-4 h-4 rotate-90" />, desc: 'Touch buttons' },
                    { id: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-4 h-4" />, desc: 'A/D or Arrow keys' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => onSelectSteeringMode(mode.id as SteeringMode)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                        steeringMode === mode.id
                          ? 'bg-zinc-100 border-white text-zinc-950 font-bold shadow-md shadow-white/5'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {mode.icon}
                      <span className="text-xs font-bold mt-1.5">{mode.label}</span>
                      <span className="text-[9px] opacity-60 mt-0.5">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* START SIMULATOR BUTTON */}
              <button
                onClick={onStartGame}
                className="w-full py-4.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 active:scale-98 transition-all rounded-xl font-black text-lg tracking-wider uppercase text-white shadow-lg shadow-red-600/10 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                START GAME
              </button>
            </motion.div>
          )}

          {activeTab === 'garage' && (
            <motion.div 
              key="garage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-grow space-y-6 py-4"
            >
              {/* BACK NAV */}
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveTab('main')} 
                  className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
                >
                  ← Back to Menu
                </button>
                <span className="text-xs font-mono text-zinc-500">Boda Mechanic Garage</span>
              </div>

              {/* BIKE SELECTION SWIPER */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Select Ride Model</h3>
                <div className="space-y-2">
                  {BIKES.map(bike => {
                    const isOwned = saveData.ownedBikes.includes(bike.id);
                    const isActive = saveData.activeBikeId === bike.id;

                    return (
                      <div 
                        key={bike.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                          isActive 
                            ? 'bg-zinc-900 border-zinc-100 shadow-lg shadow-white/5' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-sm"
                              style={{ backgroundColor: bike.color }}
                            />
                            <h4 className="font-bold text-base">{bike.name}</h4>
                            {isActive && (
                              <span className="text-[9px] bg-white text-zinc-950 font-bold px-1.5 py-0.5 rounded uppercase">Active</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 max-w-sm">{bike.description}</p>
                          <div className="flex gap-4 mt-2.5 text-[10px] text-zinc-500 font-mono">
                            <span>Top Speed: {bike.maxSpeed * 10} km/h</span>
                            <span>Handling: {bike.handling.toFixed(1)}x</span>
                          </div>
                        </div>

                        <div className="self-stretch sm:self-center flex flex-col justify-center min-w-[120px]">
                          {isActive ? (
                            <button className="w-full py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold cursor-default" disabled>
                              SELECTED
                            </button>
                          ) : isOwned ? (
                            <button 
                              onClick={() => onSelectBike(bike.id)}
                              className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-black transition"
                            >
                              CHOOSE RIDE
                            </button>
                          ) : (
                            <button 
                              onClick={() => onPurchaseBike(bike.id, bike.price)}
                              disabled={saveData.coins < bike.price}
                              className={`w-full py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 ${
                                saveData.coins >= bike.price 
                                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950' 
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              BUY FOR {bike.price}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SPEC TUNING / UPGRADES */}
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-zinc-300" /> Performance Tuning
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ENGINE */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg flex flex-col justify-between">
                    <div>
                      {renderStatBar("Engine Compression", saveData.upgrades.engine, "#f87171", <Zap className="w-3.5 h-3.5" />)}
                      <p className="text-[10px] text-zinc-500 mt-1">Boosts acceleration & max legal speed limit.</p>
                    </div>
                    {saveData.upgrades.engine < 5 ? (
                      <button
                        onClick={() => onUpgrade('engine')}
                        disabled={saveData.coins < getUpgradeCost('engine')}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
                          saveData.coins >= getUpgradeCost('engine')
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black'
                            : 'bg-zinc-900 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Upgrade ({getUpgradeCost('engine')} coins)
                      </button>
                    ) : (
                      <span className="mt-3 text-center text-xs font-bold text-emerald-500 py-1 bg-emerald-500/10 rounded">MAX TUNED</span>
                    )}
                  </div>

                  {/* BRAKES */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg flex flex-col justify-between">
                    <div>
                      {renderStatBar("Heavy-Duty Calipers", saveData.upgrades.brakes, "#60a5fa", <Gauge className="w-3.5 h-3.5" />)}
                      <p className="text-[10px] text-zinc-500 mt-1">Stops faster to prevent high-speed matatu collisions.</p>
                    </div>
                    {saveData.upgrades.brakes < 5 ? (
                      <button
                        onClick={() => onUpgrade('brakes')}
                        disabled={saveData.coins < getUpgradeCost('brakes')}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
                          saveData.coins >= getUpgradeCost('brakes')
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black'
                            : 'bg-zinc-900 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Upgrade ({getUpgradeCost('brakes')} coins)
                      </button>
                    ) : (
                      <span className="mt-3 text-center text-xs font-bold text-emerald-500 py-1 bg-emerald-500/10 rounded">MAX TUNED</span>
                    )}
                  </div>

                  {/* TIRES */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg flex flex-col justify-between">
                    <div>
                      {renderStatBar("Kenyan Grip Tread", saveData.upgrades.tires, "#34d399", <Disc className="w-3.5 h-3.5" />)}
                      <p className="text-[10px] text-zinc-500 mt-1">Improves side-to-side responsiveness to dodge mashimo.</p>
                    </div>
                    {saveData.upgrades.tires < 5 ? (
                      <button
                        onClick={() => onUpgrade('tires')}
                        disabled={saveData.coins < getUpgradeCost('tires')}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
                          saveData.coins >= getUpgradeCost('tires')
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black'
                            : 'bg-zinc-900 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Upgrade ({getUpgradeCost('tires')} coins)
                      </button>
                    ) : (
                      <span className="mt-3 text-center text-xs font-bold text-emerald-500 py-1 bg-emerald-500/10 rounded">MAX TUNED</span>
                    )}
                  </div>

                  {/* TANK */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg flex flex-col justify-between">
                    <div>
                      {renderStatBar("Extended Jerrycan Tank", saveData.upgrades.tank, "#fbbf24", <Compass className="w-3.5 h-3.5" />)}
                      <p className="text-[10px] text-zinc-500 mt-1">Larger fuel capacity for longer cross-country routes.</p>
                    </div>
                    {saveData.upgrades.tank < 5 ? (
                      <button
                        onClick={() => onUpgrade('tank')}
                        disabled={saveData.coins < getUpgradeCost('tank')}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1.5 ${
                          saveData.coins >= getUpgradeCost('tank')
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black'
                            : 'bg-zinc-900 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" /> Upgrade ({getUpgradeCost('tank')} coins)
                      </button>
                    ) : (
                      <span className="mt-3 text-center text-xs font-bold text-emerald-500 py-1 bg-emerald-500/10 rounded">MAX TUNED</span>
                    )}
                  </div>
                </div>
              </div>

              {/* WEATHER SELECTOR */}
              <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-4 mt-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-zinc-300" /> Weather & Road Conditions
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Select atmospheric conditions to test your riding skills. Different conditions alter motorcycle traction, speed, and braking distances dynamically on the highway!
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'clear', name: 'Sunny Clear', icon: '☀️', desc: 'Standard handling' },
                    { id: 'rain', name: 'Nairobi Rain', icon: '🌧️', desc: 'Slippery; long brakes' },
                    { id: 'dusty', name: 'Dusty Roads', icon: '🌪️', desc: 'Slow accel; less grip' }
                  ].map(wOpt => (
                    <button
                      key={wOpt.id}
                      onClick={() => onSelectWeather(wOpt.id as WeatherType)}
                      className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                        weather === wOpt.id
                          ? 'bg-zinc-100 border-white text-zinc-950 font-bold shadow-md shadow-white/5'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">{wOpt.icon}</span>
                      <span className="text-xs font-black tracking-tight">{wOpt.name}</span>
                      <span className="text-[9px] font-medium opacity-65 leading-tight">{wOpt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'locations' && (
            <motion.div 
              key="locations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-grow space-y-6 py-4"
            >
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveTab('main')} 
                  className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
                >
                  ← Back to Menu
                </button>
                <span className="text-xs font-mono text-zinc-500">Pick Stage</span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Kenyan Routes</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {LOCATIONS.map(loc => {
                    const isSelected = loc.id === selectedLocationId;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => onSelectLocation(loc.id)}
                        className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                          isSelected 
                            ? 'bg-zinc-900 border-zinc-100 shadow-lg shadow-white/5' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-white">{loc.name}</h4>
                            {isSelected && (
                              <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Selected</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 max-w-md">{loc.description}</p>
                          
                          {/* STAGE HAZARD SPEC SUMMARY */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[10px] text-zinc-500 font-mono">
                            <span className="flex items-center gap-1">
                              🚗 Traffic: <span className="text-zinc-300 font-bold">{Math.round(loc.trafficDensity * 10)}/10</span>
                            </span>
                            <span className="flex items-center gap-1">
                              💰 Coin Yield: <span className="text-zinc-300 font-bold">{Math.round(loc.coinDensity * 10)}/10</span>
                            </span>
                            <span className="flex items-center gap-1">
                              🕳️ Potholes: <span className="text-zinc-300 font-bold">{Math.round(loc.potholeDensity * 10)}/10</span>
                            </span>
                          </div>
                        </div>

                        {/* Background landscape hint color block */}
                        <div 
                          className="absolute right-0 bottom-0 top-0 w-2 opacity-50"
                          style={{ backgroundColor: loc.shoulderColor }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-grow space-y-6 py-4"
            >
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveTab('main')} 
                  className="text-zinc-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
                >
                  ← Back to Menu
                </button>
                <span className="text-xs font-mono text-zinc-500">Achievements</span>
              </div>

              {/* LIFETIME STATISTICS CARDS */}
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-zinc-300" /> Career Stats
                </h3>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                    <div className="text-[10px] text-zinc-500 uppercase">Max Distance</div>
                    <div className="text-lg font-black text-white mt-1">{saveData.highScoreDistance.toFixed(1)} KM</div>
                  </div>

                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                    <div className="text-[10px] text-zinc-500 uppercase">Max Coins Run</div>
                    <div className="text-lg font-black text-amber-400 mt-1">{saveData.highScoreCoins} 💰</div>
                  </div>
                </div>
              </div>

              {/* ACHIEVEMENTS CARDS */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Rider Badges</h3>
                <div className="space-y-2">
                  {ACHIEVEMENTS.map(ach => {
                    const isCompleted = saveData.completedAchievements.includes(ach.id);
                    return (
                      <div 
                        key={ach.id}
                        className={`p-3.5 rounded-lg border flex items-center justify-between transition-all ${
                          isCompleted 
                            ? 'bg-zinc-900 border-zinc-850 text-white' 
                            : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl filter drop-shadow">{ach.icon}</span>
                          <div>
                            <h4 className={`font-bold text-sm ${isCompleted ? 'text-zinc-200' : 'text-zinc-600'}`}>{ach.title}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{ach.desc}</p>
                          </div>
                        </div>

                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-zinc-800 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER TAB NAV */}
      <footer className="bg-zinc-900 border-t border-zinc-850 py-2.5 px-4 shrink-0">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'main' ? 'text-white font-bold bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Bike className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight">Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'locations' ? 'text-white font-bold bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MapPin className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight">Routes</span>
          </button>

          <button
            onClick={() => setActiveTab('garage')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'garage' ? 'text-white font-bold bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Wrench className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight">Garage</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${
              activeTab === 'stats' ? 'text-white font-bold bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Award className="w-4.5 h-4.5" />
            <span className="text-[9px] mt-1 tracking-tight">Badges</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
