import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trophy,
  Target,
  Zap,
  Clock,
  Award,
  TrendingUp,
  Star,
  Gamepad2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlayerStats {
  totalScore: number;
  bestScore: number;
  gamesPlayed: number;
  totalObjectsConsumed: number;
  totalTimePlayed: number;
  largestSize: number;
  totalCoinsEarned: number;
  averageScore: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any;
  requirement: number;
  progress: number;
  completed: boolean;
  reward: number;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<PlayerStats>({
    totalScore: 0,
    bestScore: 0,
    gamesPlayed: 0,
    totalObjectsConsumed: 0,
    totalTimePlayed: 0,
    largestSize: 0,
    totalCoinsEarned: 0,
    averageScore: 0,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first_game',
      name: 'First Steps',
      description: 'Play your first game',
      icon: Gamepad2,
      requirement: 1,
      progress: 0,
      completed: false,
      reward: 25,
    },
    {
      id: 'score_1k',
      name: 'Rising Star',
      description: 'Score 1,000 points in a single game',
      icon: Star,
      requirement: 1000,
      progress: 0,
      completed: false,
      reward: 50,
    },
    {
      id: 'score_10k',
      name: 'High Achiever',
      description: 'Score 10,000 points in a single game',
      icon: Trophy,
      requirement: 10000,
      progress: 0,
      completed: false,
      reward: 100,
    },
    {
      id: 'consume_100',
      name: 'Hungry Hungry',
      description: 'Consume 100 objects total',
      icon: Target,
      requirement: 100,
      progress: 0,
      completed: false,
      reward: 75,
    },
    {
      id: 'consume_500',
      name: 'Voracious',
      description: 'Consume 500 objects total',
      icon: Award,
      requirement: 500,
      progress: 0,
      completed: false,
      reward: 150,
    },
    {
      id: 'size_100',
      name: 'Giant',
      description: 'Reach size 100 in a single game',
      icon: TrendingUp,
      requirement: 100,
      progress: 0,
      completed: false,
      reward: 200,
    },
    {
      id: 'games_10',
      name: 'Dedicated Player',
      description: 'Play 10 games',
      icon: Zap,
      requirement: 10,
      progress: 0,
      completed: false,
      reward: 100,
    },
    {
      id: 'time_60',
      name: 'Marathon Runner',
      description: 'Play for 60 minutes total',
      icon: Clock,
      requirement: 60,
      progress: 0,
      completed: false,
      reward: 250,
    },
  ]);

  useEffect(() => {
    loadPlayerStats();
  }, []);

  const loadPlayerStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem('playerStats');
      const savedAchievements = await AsyncStorage.getItem('playerAchievements');
      
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setStats(parsedStats);
      }
      
      if (savedAchievements) {
        const parsedAchievements = JSON.parse(savedAchievements);
        setAchievements(prevAchievements =>
          prevAchievements.map(achievement => {
            const saved = parsedAchievements.find((a: any) => a.id === achievement.id);
            return saved ? { ...achievement, ...saved } : achievement;
          })
        );
      }
    } catch (error) {
      console.error('Error loading player stats:', error);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressPercentage = (progress: number, requirement: number): number => {
    return Math.min((progress / requirement) * 100, 100);
  };

  const renderStatCard = (title: string, value: string, icon: any, color: string) => {
    const IconComponent = icon;
    
    return (
      <View style={styles.statCard}>
        <LinearGradient
          colors={['rgba(30, 41, 59, 0.8)', 'rgba(51, 65, 85, 0.8)']}
          style={styles.statCardGradient}
        >
          <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
            <IconComponent color={color} size={24} />
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderAchievement = (achievement: Achievement) => {
    const IconComponent = achievement.icon;
    const progressPercentage = getProgressPercentage(achievement.progress, achievement.requirement);
    
    return (
      <View key={achievement.id} style={styles.achievementCard}>
        <LinearGradient
          colors={
            achievement.completed
              ? ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.2)']
              : ['rgba(30, 41, 59, 0.8)', 'rgba(51, 65, 85, 0.8)']
          }
          style={styles.achievementGradient}
        >
          <View style={styles.achievementHeader}>
            <View style={[
              styles.achievementIcon,
              { backgroundColor: achievement.completed ? '#10B981' : '#334155' }
            ]}>
              <IconComponent
                color={achievement.completed ? '#FFFFFF' : '#94A3B8'}
                size={20}
              />
            </View>
            <View style={styles.achievementInfo}>
              <Text style={[
                styles.achievementName,
                achievement.completed && styles.completedText
              ]}>
                {achievement.name}
              </Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>
            </View>
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardText}>+{achievement.reward}</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${progressPercentage}%` }
              ]} />
            </View>
            <Text style={styles.progressText}>
              {Math.min(achievement.progress, achievement.requirement)}/{achievement.requirement}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PLAYER STATS</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard('Best Score', stats.bestScore.toLocaleString(), Trophy, '#FFD700')}
          {renderStatCard('Games Played', stats.gamesPlayed.toString(), Gamepad2, '#00D4AA')}
          {renderStatCard('Objects Consumed', stats.totalObjectsConsumed.toLocaleString(), Target, '#8B5CF6')}
          {renderStatCard('Time Played', formatTime(stats.totalTimePlayed), Clock, '#06B6D4')}
          {renderStatCard('Largest Size', Math.floor(stats.largestSize).toString(), TrendingUp, '#F59E0B')}
          {renderStatCard('Total Coins', stats.totalCoinsEarned.toLocaleString(), Award, '#EF4444')}
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
          <View style={styles.achievementsList}>
            {achievements.map(renderAchievement)}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Keep playing to unlock more achievements and earn rewards!
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  achievementsList: {
    gap: 12,
  },
  achievementCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  achievementGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  completedText: {
    color: '#10B981',
  },
  achievementDescription: {
    color: '#94A3B8',
    fontSize: 14,
  },
  rewardContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 3,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
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