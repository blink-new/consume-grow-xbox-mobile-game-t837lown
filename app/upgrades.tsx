import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Maximize, Coins, Flame, Shield, Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: any;
  basePrice: number;
  level: number;
  maxLevel: number;
  benefit: string;
}

export default function UpgradesScreen() {
  const [coins, setCoins] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    {
      id: 'speed',
      name: 'Speed Boost',
      description: 'Move faster across the arena',
      icon: Zap,
      basePrice: 50,
      level: 0,
      maxLevel: 10,
      benefit: '+10% movement speed',
    },
    {
      id: 'startSize',
      name: 'Starting Size',
      description: 'Begin each game larger',
      icon: Maximize,
      basePrice: 100,
      level: 0,
      maxLevel: 8,
      benefit: '+5 starting size',
    },
    {
      id: 'coinBonus',
      name: 'Coin Multiplier',
      description: 'Earn more coins from objects',
      icon: Coins,
      basePrice: 75,
      level: 0,
      maxLevel: 15,
      benefit: '+15% coin rewards',
    },
    {
      id: 'magnetism',
      name: 'Magnetism',
      description: 'Attract nearby objects',
      icon: Flame,
      basePrice: 200,
      level: 0,
      maxLevel: 5,
      benefit: 'Larger attraction radius',
    },
    {
      id: 'shield',
      name: 'Protection',
      description: 'Resistance to larger objects',
      icon: Shield,
      basePrice: 300,
      level: 0,
      maxLevel: 3,
      benefit: 'Survive bigger threats',
    },
    {
      id: 'experience',
      name: 'XP Multiplier',
      description: 'Level up faster',
      icon: Star,
      basePrice: 150,
      level: 0,
      maxLevel: 12,
      benefit: '+20% experience gain',
    },
  ]);

  useEffect(() => {
    loadPlayerData();
  }, []);

  const loadPlayerData = async () => {
    try {
      const savedCoins = await AsyncStorage.getItem('playerCoins');
      const savedUpgrades = await AsyncStorage.getItem('playerUpgrades');
      
      if (savedCoins) {
        setCoins(parseInt(savedCoins));
      }
      
      if (savedUpgrades) {
        const parsedUpgrades = JSON.parse(savedUpgrades);
        setUpgrades(prevUpgrades => 
          prevUpgrades.map(upgrade => {
            const saved = parsedUpgrades.find((u: any) => u.id === upgrade.id);
            return saved ? { ...upgrade, level: saved.level } : upgrade;
          })
        );
      }
    } catch (error) {
      console.error('Error loading player data:', error);
    }
  };

  const savePlayerData = async (newCoins: number, newUpgrades: Upgrade[]) => {
    try {
      await AsyncStorage.setItem('playerCoins', newCoins.toString());
      await AsyncStorage.setItem('playerUpgrades', JSON.stringify(newUpgrades));
    } catch (error) {
      console.error('Error saving player data:', error);
    }
  };

  const calculatePrice = (basePrice: number, level: number): number => {
    return Math.floor(basePrice * Math.pow(1.5, level));
  };

  const purchaseUpgrade = (upgradeId: string) => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.level >= upgrade.maxLevel) return;

    const price = calculatePrice(upgrade.basePrice, upgrade.level);
    
    if (coins < price) {
      Alert.alert('Insufficient Coins', `You need ${price} coins for this upgrade.`);
      return;
    }

    const newCoins = coins - price;
    const newUpgrades = upgrades.map(u => 
      u.id === upgradeId ? { ...u, level: u.level + 1 } : u
    );

    setCoins(newCoins);
    setUpgrades(newUpgrades);
    savePlayerData(newCoins, newUpgrades);

    Alert.alert('Upgrade Purchased!', `${upgrade.name} is now level ${upgrade.level + 1}`);
  };

  const renderUpgradeCard = (upgrade: Upgrade) => {
    const IconComponent = upgrade.icon;
    const price = calculatePrice(upgrade.basePrice, upgrade.level);
    const isMaxLevel = upgrade.level >= upgrade.maxLevel;
    const canAfford = coins >= price;

    return (
      <TouchableOpacity
        key={upgrade.id}
        style={styles.upgradeCard}
        onPress={() => purchaseUpgrade(upgrade.id)}
        disabled={isMaxLevel || !canAfford}
      >
        <LinearGradient
          colors={
            isMaxLevel
              ? ['#059669', '#10B981']
              : canAfford
              ? ['#1E293B', '#334155']
              : ['#374151', '#4B5563']
          }
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <IconComponent
                color={isMaxLevel ? '#FFFFFF' : canAfford ? '#00D4AA' : '#9CA3AF'}
                size={24}
              />
            </View>
            <View style={styles.levelContainer}>
              <Text style={styles.levelText}>
                {upgrade.level}/{upgrade.maxLevel}
              </Text>
            </View>
          </View>

          <Text style={styles.upgradeName}>{upgrade.name}</Text>
          <Text style={styles.upgradeDescription}>{upgrade.description}</Text>
          <Text style={styles.upgradeBenefit}>{upgrade.benefit}</Text>

          <View style={styles.priceContainer}>
            {isMaxLevel ? (
              <Text style={styles.maxLevelText}>MAX LEVEL</Text>
            ) : (
              <>
                <Coins color="#FFD700" size={16} />
                <Text style={[styles.priceText, !canAfford && styles.insufficientText]}>
                  {price.toLocaleString()}
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>UPGRADES</Text>
        <View style={styles.coinsDisplay}>
          <Coins color="#FFD700" size={20} />
          <Text style={styles.coinsText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.upgradesGrid}>
          {upgrades.map(renderUpgradeCard)}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Earn coins by playing and consuming objects!</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  coinsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  coinsText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  upgradesGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  upgradeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  upgradeDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  upgradeBenefit: {
    color: '#00D4AA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  insufficientText: {
    color: '#EF4444',
  },
  maxLevelText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});