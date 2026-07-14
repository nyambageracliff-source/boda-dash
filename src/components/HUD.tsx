/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Flame, Navigation, Zap, Shield, Heart, ShieldAlert } from 'lucide-react';
import { Passenger, SteeringMode } from '../types';

interface HUDProps {
  coins: number;
  speed: number;
  distance: number;
  fuel: number;
  maxFuel: number;
  passenger: Passenger | null;
  steeringMode: SteeringMode;
  onSteerLeft: (active: boolean) => void;
  onSteerRight: (active: boolean) => void;
  onGas: (active: boolean) => void;
  onBrake: (active: boolean) => void;
  onHorn: () => void;
  warningMessage: string | null;
  isPaused: boolean;
  onPauseToggle: () => void;
  onExitGame: () => void;
}

export default function HUD({
  coins,
  speed,
  distance,
  fuel,
  maxFuel,
  passenger,
  steeringMode,
  onSteerLeft,
  onSteerRight,
  onGas,
  onBrake,
  onHorn,
  warningMessage,
  isPaused,
  onPauseToggle,
  onExitGame
}: HUDProps) {
  const fuelPercentage = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
  const isFuelLow = fuelPercentage < 25;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 font-sans text-white z-20">
      {/* TOP FLOATING PANELS */}
      <div className="w-full flex justify-between items-start pointer-events-auto shrink-0 gap-3">
        {/* LEADER STATS */}
        <div className="flex flex-col gap-1.5 max-w-[40%]">
          {/* COIN COUNTER */}
          <div className="flex items-center gap-2 bg-zinc-950/80 backdrop-blur border border-zinc-800/80 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block leading-none font-mono">KES SHILINGI</span>
              <span className="text-sm font-black font-mono tracking-tight leading-none text-amber-400">{coins}</span>
            </div>
          </div>

          {/* TRAVEL DISTANCE */}
          <div className="flex items-center gap-2 bg-zinc-950/80 backdrop-blur border border-zinc-800/80 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Navigation className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block leading-none font-mono">DISTANCE</span>
              <span className="text-sm font-black font-mono tracking-tight leading-none text-blue-400">
                {distance.toFixed(2)} <span className="text-[10px] font-bold text-zinc-400">KM</span>
              </span>
            </div>
          </div>
        </div>

        {/* SPEEDOMETER & FUEL */}
        <div className="flex flex-col items-end gap-1.5 max-w-[40%]">
          {/* SPEEDOMETER */}
          <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800/80 rounded-xl px-3 py-1.5 text-right w-full flex items-center justify-end gap-2.5">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold block leading-none font-mono">SPEED</span>
              <span className="text-lg font-black font-mono tracking-tight leading-none text-zinc-100">
                {Math.floor(speed * 9)} <span className="text-xs font-bold text-red-500">KM/H</span>
              </span>
            </div>
            <div className="w-7 h-7 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-500">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          {/* FUEL METER */}
          <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800/80 rounded-xl px-3 py-1.5 w-full">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 mb-1 leading-none font-mono">
              <span className="flex items-center gap-1">
                <Flame className={`w-3.5 h-3.5 ${isFuelLow ? 'text-red-500 animate-bounce' : 'text-amber-500'}`} />
                PETROL
              </span>
              <span className={isFuelLow ? 'text-red-400 font-black animate-pulse' : 'text-zinc-200'}>
                {Math.round(fuelPercentage)}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isFuelLow ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                }`}
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER POPUP NOTIFICATIONS (e.g. Danger warnings or Stage messages) */}
      <div className="flex-1 flex flex-col justify-center items-center gap-3">
        <AnimatePresence>
          {warningMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="px-4 py-2.5 bg-red-600/90 backdrop-blur border border-red-500 text-white rounded-xl shadow-xl flex items-center gap-2 max-w-sm text-center"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 animate-bounce text-yellow-300" />
              <span className="text-xs font-black uppercase tracking-wider font-mono">{warningMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PASSENGER RIDE DETAIL DRAWER */}
      <div className="w-full max-w-sm mx-auto pointer-events-auto shrink-0 mb-3">
        <AnimatePresence>
          {passenger && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-zinc-950/90 backdrop-blur border border-zinc-800 p-3 rounded-xl shadow-2xl flex flex-col gap-2 relative overflow-hidden"
            >
              {/* Kenyan accent strip on the passenger status card */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-white to-green-500" />

              <div className="flex justify-between items-center gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl filter drop-shadow bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    {passenger.avatar}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{passenger.name}</h4>
                    <span className="text-[9px] font-mono font-black text-zinc-400 tracking-wider uppercase">
                      PASSENGER ON BOARD
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-bold font-mono block uppercase leading-none">Fare reward</span>
                  <span className="text-sm font-black font-mono text-emerald-400 leading-none">
                    +{Math.floor(passenger.fare * passenger.payrate)} 💰
                  </span>
                </div>
              </div>

              {/* STATS DEPENDING ON PASSENGER TYPE */}
              {passenger.role === 'mzee' && (
                <div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-400 mb-1">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Comfort Level</span>
                    <span className={passenger.comfort < 40 ? 'text-red-400 font-bold' : 'text-yellow-400'}>
                      {passenger.comfort}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        passenger.comfort < 40 ? 'bg-red-500' : 'bg-yellow-400'
                      }`}
                      style={{ width: `${passenger.comfort}%` }}
                    />
                  </div>
                </div>
              )}

              {passenger.role === 'student' && passenger.timeLimit !== undefined && (
                <div className="flex justify-between items-center bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 text-xs font-mono">
                  <span className="text-zinc-400 font-bold uppercase">TIME LEFT:</span>
                  <span className={`font-black ${passenger.timeLimit < 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                    {Math.max(0, Math.ceil(passenger.timeLimit))}s
                  </span>
                </div>
              )}

              {/* DESTINATION PROGRESS */}
              <div className="mt-1">
                <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-500 uppercase">
                  <span>Departure</span>
                  <span>Destination</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden my-1 relative">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(passenger.distanceTraveled / passenger.targetDistance) * 100}%` }}
                  />
                </div>
                <div className="text-center text-[10px] text-zinc-300 font-mono font-bold mt-0.5">
                  {(passenger.targetDistance - passenger.distanceTraveled).toFixed(2)} KM remaining to drop-off
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM CONTROL BUTTONS PANEL */}
      <div className="w-full pointer-events-auto shrink-0 flex flex-col gap-3 mb-[10px]">
        {/* HORN & PAUSE MENU FLOATER ROW */}
        <div className="flex justify-between items-center px-2">
          {/* PAUSE BUTTON */}
          <button
            onClick={onPauseToggle}
            className="w-9 h-9 rounded-lg bg-zinc-950/80 backdrop-blur hover:bg-zinc-900 text-zinc-300 border border-zinc-800/80 active:scale-95 flex items-center justify-center text-xs font-black transition-all"
          >
            {isPaused ? '▶' : '⏸'}
          </button>

          {/* QUICK HORN */}
          <button
            onClick={onHorn}
            className="px-3.5 py-2 rounded-lg bg-amber-500/90 backdrop-blur hover:bg-amber-400 text-zinc-950 border border-amber-600/50 active:scale-95 font-black text-[10px] tracking-wider flex items-center gap-1 transition-all shadow-md shadow-amber-500/10"
          >
            🔊 HONK!
          </button>

          {/* EXIT / HOME */}
          <button
            onClick={onExitGame}
            className="w-9 h-9 rounded-lg bg-zinc-950/80 backdrop-blur hover:bg-zinc-900 text-red-400 border border-zinc-800/80 active:scale-95 flex items-center justify-center text-sm font-black transition-all"
            title="Exit Ride"
          >
            🏠
          </button>
        </div>

        {/* CONTROLS AREA */}
        <div className="flex justify-between items-center gap-4 py-1 px-1">
          {/* STEERING (IF TOUCH/BUTTONS MODE IS SELECTED) */}
          {steeringMode === 'buttons' ? (
            <div className="flex gap-1.5">
              <button
                onTouchStart={() => onSteerLeft(true)}
                onTouchEnd={() => onSteerLeft(false)}
                onMouseDown={() => onSteerLeft(true)}
                onMouseUp={() => onSteerLeft(false)}
                onMouseLeave={() => onSteerLeft(false)}
                className="w-14 h-14 rounded-full bg-zinc-950/85 border-2 border-zinc-700 active:border-zinc-100 active:bg-zinc-800/90 text-zinc-200 select-none flex flex-col items-center justify-center text-lg font-extrabold transition-all active:scale-95 shadow-lg"
              >
                ◀
                <span className="text-[7px] font-mono text-zinc-400 mt-0.5 leading-none">LEFT</span>
              </button>

              <button
                onTouchStart={() => onSteerRight(true)}
                onTouchEnd={() => onSteerRight(false)}
                onMouseDown={() => onSteerRight(true)}
                onMouseUp={() => onSteerRight(false)}
                onMouseLeave={() => onSteerRight(false)}
                className="w-14 h-14 rounded-full bg-zinc-950/85 border-2 border-zinc-700 active:border-zinc-100 active:bg-zinc-800/90 text-zinc-200 select-none flex flex-col items-center justify-center text-lg font-extrabold transition-all active:scale-95 shadow-lg"
              >
                ▶
                <span className="text-[7px] font-mono text-zinc-400 mt-0.5 leading-none">RIGHT</span>
              </button>
            </div>
          ) : (
            <div className="w-1 flex-1 opacity-20 text-[9px] text-zinc-500 font-mono italic self-center pl-2">
              {steeringMode === 'tilt' ? 'Tilt phone left/right to steer' : 'Use A/D or Arrow Keys to steer'}
            </div>
          )}

          {/* ENGINE DRIVE (GAS / BRAKE) */}
          <div className="flex gap-2">
            {/* BRAKE BUTTON */}
            <button
              onTouchStart={() => onBrake(true)}
              onTouchEnd={() => onBrake(false)}
              onMouseDown={() => onBrake(true)}
              onMouseUp={() => onBrake(false)}
              onMouseLeave={() => onBrake(false)}
              className="w-16 h-16 rounded-xl bg-zinc-950/85 border-2 border-red-800 active:border-red-500 active:bg-red-950/90 text-red-500 select-none flex flex-col items-center justify-center font-black text-xs tracking-wider transition-all active:scale-95 shadow-lg"
            >
              <Shield className="w-4 h-4 mb-0.5" />
              BRAKE
            </button>

            {/* GAS BUTTON */}
            <button
              onTouchStart={() => onGas(true)}
              onTouchEnd={() => onGas(false)}
              onMouseDown={() => onGas(true)}
              onMouseUp={() => onGas(false)}
              onMouseLeave={() => onGas(false)}
              className="w-16 h-16 rounded-xl bg-emerald-600/85 border-2 border-emerald-700 active:border-emerald-300 active:bg-emerald-500/90 text-white select-none flex flex-col items-center justify-center font-black text-xs tracking-wider transition-all active:scale-95 shadow-lg"
            >
              <Zap className="w-4 h-4 mb-0.5 text-yellow-300 fill-current" />
              GAS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
