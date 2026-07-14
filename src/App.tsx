/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  Coins, 
  Navigation, 
  RotateCcw, 
  Home, 
  Award, 
  Volume2, 
  VolumeX, 
  Check, 
  Zap,
  Flame,
  ShieldAlert,
  XCircle
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import Menu from './components/Menu';
import HUD from './components/HUD';
import GameCanvas from './components/GameCanvas';
import { BodaAudio } from './audio';
import { UserSaveData, Passenger, Upgrades, SteeringMode, WeatherType } from './types';
import { BIKES, LOCATIONS } from './configs';

const SAVE_KEY = 'boda_rider_ke_save_v1';

const INITIAL_SAVE: UserSaveData = {
  coins: 150, // Starting bonus so the user can test buying/upgrading instantly!
  ownedBikes: ['boxer_150'],
  activeBikeId: 'boxer_150',
  upgrades: {
    engine: 0,
    brakes: 0,
    tires: 0,
    tank: 0
  },
  highScoreDistance: 0,
  highScoreCoins: 0,
  completedAchievements: []
};

export default function App() {
  const [saveData, setSaveData] = useState<UserSaveData>(INITIAL_SAVE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('nairobi_highway');
  const [steeringMode, setSteeringMode] = useState<SteeringMode>('buttons');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [weather, setWeather] = useState<WeatherType>('clear');

  // Active game session report stats
  const [runCoins, setRunCoins] = useState<number>(0);
  const [runDistance, setRunDistance] = useState<number>(0);
  const [runSpeed, setRunSpeed] = useState<number>(0);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // End run gameover state
  const [gameOverInfo, setGameOverInfo] = useState<{
    coins: number;
    distance: number;
    reason: string;
    unlockedBadges: string[];
    isCrash?: boolean;
  } | null>(null);

  // 1. LOAD SAVE DATA FROM STORAGE AND INITIALIZE CAPACITOR
  useEffect(() => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Merge with initial save to prevent undefined fields
        setSaveData({
          ...INITIAL_SAVE,
          ...parsed,
          upgrades: {
            ...INITIAL_SAVE.upgrades,
            ...(parsed.upgrades || {})
          }
        });
      } catch (e) {
        console.warn("Failed to load boda save data, resetting:", e);
      }
    }

    // Hide status bar for immersive full screen on mobile/Android
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.hide();
        } catch (e) {
          console.warn("Failed to hide status bar:", e);
        }
      }
    };
    initCapacitor();
  }, []);

  // 2. SAVE STATE HELPER
  const save = (updated: UserSaveData) => {
    setSaveData(updated);
    localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
  };

  // Sound toggler
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (!nextVal) {
      BodaAudio.stopEngine();
    }
  };

  // Play audio triggers safely
  const triggerAudioEffect = (type: 'coin' | 'fuel' | 'crash' | 'success' | 'horn') => {
    if (!soundEnabled) return;
    switch (type) {
      case 'coin': BodaAudio.playCoin(); break;
      case 'fuel': BodaAudio.playFuel(); break;
      case 'crash': BodaAudio.playCrash(); break;
      case 'success': BodaAudio.playSuccess(); break;
      case 'horn': BodaAudio.playHorn(); break;
    }
  };

  // Upgrades buying logic
  const handleUpgrade = (type: keyof Upgrades) => {
    const currentLevel = saveData.upgrades[type];
    if (currentLevel >= 5) return;

    const cost = 80 + currentLevel * 120;
    if (saveData.coins >= cost) {
      const nextUpgrades = {
        ...saveData.upgrades,
        [type]: currentLevel + 1
      };
      const updated = {
        ...saveData,
        coins: saveData.coins - cost,
        upgrades: nextUpgrades
      };
      save(updated);
      triggerAudioEffect('success');
    }
  };

  // Bikes purchasing logic
  const handlePurchaseBike = (bikeId: string, price: number) => {
    if (saveData.coins >= price && !saveData.ownedBikes.includes(bikeId)) {
      const updated = {
        ...saveData,
        coins: saveData.coins - price,
        ownedBikes: [...saveData.ownedBikes, bikeId],
        activeBikeId: bikeId // Auto equip
      };
      save(updated);
      triggerAudioEffect('success');
    }
  };

  // Select/Equip Bike
  const handleSelectBike = (bikeId: string) => {
    if (saveData.ownedBikes.includes(bikeId)) {
      save({
        ...saveData,
        activeBikeId: bikeId
      });
      triggerAudioEffect('coin');
    }
  };

  // Start continuous engine loops
  const handleStartGame = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setGameOverInfo(null);
    setRunCoins(0);
    setRunDistance(0);
    setPassenger(null);
    setWarningMessage(null);
    
    if (soundEnabled) {
      BodaAudio.startEngine();
    }
  };

  // End game state handler
  const handleGameOver = (finalCoins: number, distance: number, reason: string, isCrash?: boolean) => {
    BodaAudio.stopEngine();
    setIsPlaying(false);

    // Calculate earned achievements this run
    const newUnlockedBadges: string[] = [];
    const currentAchievements = [...saveData.completedAchievements];

    if (!currentAchievements.includes('first_ride') && distance > 0.4) {
      newUnlockedBadges.push('first_ride');
      currentAchievements.push('first_ride');
    }
    if (!currentAchievements.includes('coin_hunter') && finalCoins >= 100) {
      newUnlockedBadges.push('coin_hunter');
      currentAchievements.push('coin_hunter');
    }
    if (!currentAchievements.includes('distance_pro') && (saveData.highScoreDistance + distance) > 5.0) {
      newUnlockedBadges.push('distance_pro');
      currentAchievements.push('distance_pro');
    }
    if (!currentAchievements.includes('pothole_survivor') && distance > 1.2 && finalCoins >= 40) {
      newUnlockedBadges.push('pothole_survivor');
      currentAchievements.push('pothole_survivor');
    }
    if (!currentAchievements.includes('matatu_ninja') && distance > 2.0 && finalCoins >= 60) {
      newUnlockedBadges.push('matatu_ninja');
      currentAchievements.push('matatu_ninja');
    }

    const updatedCoins = saveData.coins + finalCoins;
    const nextMaxDistance = Math.max(saveData.highScoreDistance, distance);
    const nextMaxCoins = Math.max(saveData.highScoreCoins, finalCoins);

    save({
      ...saveData,
      coins: updatedCoins,
      highScoreDistance: nextMaxDistance,
      highScoreCoins: nextMaxCoins,
      completedAchievements: currentAchievements
    });

    setGameOverInfo({
      coins: finalCoins,
      distance: distance,
      reason: reason,
      unlockedBadges: newUnlockedBadges,
      isCrash: isCrash
    });
  };

  // Manual touch steering button controls state
  const [leftSteerPressed, setLeftSteerPressed] = useState<boolean>(false);
  const [rightSteerPressed, setRightSteerPressed] = useState<boolean>(false);
  const [gasPressed, setGasPressed] = useState<boolean>(false);
  const [brakePressed, setBrakePressed] = useState<boolean>(false);

  return (
    <div className="relative w-full h-screen select-none overflow-hidden bg-zinc-950 flex flex-col justify-center items-center">
      {/* 1. MAIN MENU */}
      {!isPlaying && !gameOverInfo && (
        <Menu
          saveData={saveData}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
          steeringMode={steeringMode}
          onSelectSteeringMode={setSteeringMode}
          weather={weather}
          onSelectWeather={setWeather}
          onUpgrade={handleUpgrade}
          onPurchaseBike={handlePurchaseBike}
          onSelectBike={handleSelectBike}
          onStartGame={handleStartGame}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* 2. LIVE GAMEPLAY PREVIEW STAGE */}
      {isPlaying && (
        <div className="absolute inset-0 w-full h-full flex flex-col justify-end">
          {/* Interactive HTML5 Canvas Game Engine */}
          <GameCanvas
            activeBikeId={saveData.activeBikeId}
            locationId={selectedLocationId}
            upgrades={saveData.upgrades}
            steeringMode={steeringMode}
            weather={weather}
            isPaused={isPaused}
            leftSteerPressed={leftSteerPressed}
            rightSteerPressed={rightSteerPressed}
            gasPressed={gasPressed}
            brakePressed={brakePressed}
            onGameStatsUpdate={(coins, distance, speed) => {
              setRunCoins(coins);
              setRunDistance(distance);
              setRunSpeed(speed);
            }}
            onPassengerUpdate={setPassenger}
            onTriggerWarning={setWarningMessage}
            onGameOver={handleGameOver}
            onPlaySound={triggerAudioEffect}
            soundEnabled={soundEnabled}
          />

          {/* Floating UI HUD elements on top of the canvas */}
          <HUD
            coins={runCoins}
            speed={runSpeed}
            distance={runDistance}
            fuel={runCoins * 0.1 /* simulated / fallback values synced in canvas */}
            maxFuel={100}
            passenger={passenger}
            steeringMode={steeringMode}
            onSteerLeft={setLeftSteerPressed}
            onSteerRight={setRightSteerPressed}
            onGas={setGasPressed}
            onBrake={setBrakePressed}
            onHorn={() => triggerAudioEffect('horn')}
            warningMessage={warningMessage}
            isPaused={isPaused}
            onPauseToggle={() => {
              setIsPaused(!isPaused);
              if (soundEnabled) {
                if (isPaused) BodaAudio.startEngine();
                else BodaAudio.stopEngine();
              }
            }}
            onExitGame={() => {
              if (window.confirm("Buda, are you sure you want to stop this ride? Coins collected this run won't be saved!")) {
                BodaAudio.stopEngine();
                setIsPlaying(false);
              }
            }}
          />

          {/* PAUSED DRAWER OVERLAY */}
          {isPaused && (
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm z-30 flex flex-col justify-center items-center p-6 text-center">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full space-y-6 shadow-2xl">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white">RIDE PAUSED</h3>
                  <p className="text-xs text-zinc-400 mt-1">Take a breath, then get back to the streets</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsPaused(false);
                      if (soundEnabled) BodaAudio.startEngine();
                    }}
                    className="w-full py-3 bg-white text-zinc-950 font-black rounded-xl text-sm tracking-wider uppercase transition hover:bg-zinc-200"
                  >
                    CONTINUE RIDING
                  </button>

                  <button
                    onClick={() => {
                      BodaAudio.stopEngine();
                      setIsPlaying(false);
                    }}
                    className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 font-bold rounded-xl text-xs uppercase"
                  >
                    RETURN TO MENU
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. GAME OVER SUMMARY SCORECARD */}
      {gameOverInfo && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-40 flex flex-col justify-center items-center p-4 overflow-y-auto"
          >
            {/* KENYAN FLAG STRIP */}
            <div className="absolute top-0 left-0 right-0 h-2 flex">
              <div className="bg-black h-full flex-1" />
              <div className="bg-red-600 h-full flex-1" />
              <div className="bg-green-600 h-full flex-1" />
            </div>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl text-center"
            >
              <div>
                {gameOverInfo.isCrash ? (
                  <>
                    <span className="w-12 h-12 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-500/20">
                      <XCircle className="w-6 h-6 animate-pulse text-red-500" />
                    </span>
                    <h2 className="text-3xl font-black tracking-tight text-red-500 leading-none">MISSION FAILED</h2>
                  </>
                ) : (
                  <>
                    <span className="w-12 h-12 bg-amber-600/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
                      <ShieldAlert className="w-6 h-6 animate-bounce text-amber-500" />
                    </span>
                    <h2 className="text-3xl font-black tracking-tight text-amber-500 leading-none">OUT OF PETROL</h2>
                  </>
                )}
                <p className="text-xs text-red-400 font-mono uppercase tracking-wider mt-3 px-2.5 py-1 bg-red-500/10 rounded-full inline-block">
                  {gameOverInfo.reason}
                </p>
              </div>

              {/* GAME SCORE DETAILS */}
              <div className="grid grid-cols-2 gap-3.5 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider">DISTANCE</span>
                  <div className="flex items-center justify-center gap-1">
                    <Navigation className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xl font-black text-white font-mono">{gameOverInfo.distance.toFixed(2)}</span>
                    <span className="text-xs text-zinc-500 font-bold">KM</span>
                  </div>
                </div>

                <div className="text-center space-y-1 border-l border-zinc-850">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-wider">EARNINGS</span>
                  <div className="flex items-center justify-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    <span className="text-xl font-black text-amber-400 font-mono">+{gameOverInfo.coins}</span>
                    <span className="text-xs text-zinc-500 font-bold">KES</span>
                  </div>
                </div>
              </div>

              {/* NEW UNLOCKED ACHIEVEMENT BADGES */}
              {gameOverInfo.unlockedBadges.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-left">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <Award className="w-4 h-4 text-emerald-400" /> BADGES UNLOCKED!
                  </h4>
                  <div className="space-y-1.5">
                    {gameOverInfo.unlockedBadges.map(bId => {
                      const details = [
                        { id: 'first_ride', title: 'Stage 1 Complete' },
                        { id: 'coin_hunter', title: 'Chapaa Master' },
                        { id: 'distance_pro', title: 'Long Distance Rider' },
                        { id: 'pothole_survivor', title: 'Shock Absorber Pro' },
                        { id: 'matatu_ninja', title: 'Matatu Ninja' }
                      ].find(b => b.id === bId);

                      return (
                        <div key={bId} className="flex items-center gap-1.5 text-xs text-zinc-300">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-extrabold">{details?.title}</span> unlocked!
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACTION CALLS */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleStartGame}
                  className="w-full py-4.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black rounded-xl text-base tracking-wider uppercase transition active:scale-98 shadow-lg shadow-red-500/10"
                >
                  RIDE AGAIN
                </button>

                <button
                  onClick={() => setGameOverInfo(null)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-extrabold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5"
                >
                  <Home className="w-4 h-4" />
                  GOTO GARAGE & TUNING
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
