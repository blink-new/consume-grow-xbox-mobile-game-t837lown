import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PlayerStats {
  totalScore: number;
  bestScore: number;
  gamesPlayed: number;
  totalObjectsConsumed: number;
  totalTimePlayed: number;
  largestSize: number;
  totalCoinsEarned: number;
  averageScore: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  level: number;
  maxLevel: number;
  benefit: string;
}

const initialStats: PlayerStats = {
  totalScore: 0,
  bestScore: 0,
  gamesPlayed: 0,
  totalObjectsConsumed: 0,
  totalTimePlayed: 0,
  largestSize: 0,
  totalCoinsEarned: 0,
  averageScore: 0,
};

export const useGameData = () => {
  const [stats, setStats] = useState<PlayerStats>(initialStats);
  const [coins, setCoins] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      const [savedStats, savedCoins, savedUpgrades] = await Promise.all([
        AsyncStorage.getItem('playerStats'),
        AsyncStorage.getItem('playerCoins'),
        AsyncStorage.getItem('playerUpgrades'),
      ]);

      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }

      if (savedCoins) {
        setCoins(parseInt(savedCoins));
      }

      if (savedUpgrades) {
        setUpgrades(JSON.parse(savedUpgrades));
      }
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  };

  const saveGameData = async (newStats?: PlayerStats, newCoins?: number, newUpgrades?: Upgrade[]) => {
    try {
      const savePromises = [];

      if (newStats) {
        savePromises.push(AsyncStorage.setItem('playerStats', JSON.stringify(newStats)));
        setStats(newStats);
      }

      if (newCoins !== undefined) {
        savePromises.push(AsyncStorage.setItem('playerCoins', newCoins.toString()));
        setCoins(newCoins);
      }

      if (newUpgrades) {
        savePromises.push(AsyncStorage.setItem('playerUpgrades', JSON.stringify(newUpgrades)));
        setUpgrades(newUpgrades);
      }

      await Promise.all(savePromises);
    } catch (error) {
      console.error('Error saving game data:', error);
    }
  };

  const updateGameStats = async (gameScore: number, objectsConsumed: number, maxSize: number, timePlayed: number) => {
    const coinsEarned = Math.floor(gameScore / 10);
    
    const newStats: PlayerStats = {
      ...stats,
      totalScore: stats.totalScore + gameScore,
      bestScore: Math.max(stats.bestScore, gameScore),
      gamesPlayed: stats.gamesPlayed + 1,
      totalObjectsConsumed: stats.totalObjectsConsumed + objectsConsumed,
      totalTimePlayed: stats.totalTimePlayed + timePlayed,
      largestSize: Math.max(stats.largestSize, maxSize),
      totalCoinsEarned: stats.totalCoinsEarned + coinsEarned,
      averageScore: Math.floor((stats.totalScore + gameScore) / (stats.gamesPlayed + 1)),
    };

    const newCoins = coins + coinsEarned;

    await saveGameData(newStats, newCoins);
    return coinsEarned;
  };

  return {
    stats,
    coins,
    upgrades,
    loadGameData,
    saveGameData,
    updateGameStats,
  };
};