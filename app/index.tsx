import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Text,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameData } from '@/hooks/useGameData';
import { Pause, Play, RotateCcw, MoveRight, Zap, TrendingDown } from 'lucide-react-native'; // Added Zap and TrendingDown

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const WORLD_SIZE = 2000;
const INITIAL_PLAYER_SIZE = 30;
const MIN_PLAYER_SIZE_TO_SPLIT = 50;
const MIN_PLAYER_SIZE_TO_EJECT = 20;
const EJECTED_MASS_SIZE = 10;
const EJECTED_MASS_COST = 5; // Size lost when ejecting
const MAX_PLAYER_CIRCLES = 4; // Max number of circles player can control
const SPLIT_DISTANCE_FACTOR = 1.5; // How far split circles shoot out
const MERGE_DELAY = 5000; // 5 seconds before player circles can merge

const INITIAL_PLAYER_SPEED = 1.5;
const MAX_FOOD_DOTS = 150;
const MAX_AI_OPPONENTS = 5;

interface PlayerCircle extends Circle {
  canMergeAt?: number; // Timestamp when this circle can merge
}

interface Circle {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  isPlayer?: boolean;
  isAI?: boolean;
  vx?: number;
  vy?: number;
  targetX?: number;
  targetY?: number;
  lastChangedDirection?: number;
}

interface FoodDot {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  points: number;
  isEjectedMass?: boolean; // To differentiate from regular food
}

interface Particle {
  id: string;
  x: number;
  y: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

export default function GameScreen() {
  const { updateGameStats } = useGameData();

  const [playerCircles, setPlayerCircles] = useState<PlayerCircle[]>([{
    id: 'player-0',
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    size: INITIAL_PLAYER_SIZE,
    color: '#00D4AA',
    isPlayer: true,
    canMergeAt: 0,
  }]);

  const [aiOpponents, setAiOpponents] = useState<Circle[]>([]);
  const [foodDots, setFoodDots] = useState<FoodDot[]>([]);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [objectsConsumed, setObjectsConsumed] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  const playerScale = useRef(new Animated.Value(1)).current;
  const gameTimeRef = useRef(0);
  const joystickDirection = useRef({ x: 0, y: 0 });
  const cameraOffset = useRef({ x: 0, y: 0 });
  const playerCirclesRef = useRef(playerCircles);
  const scoreRef = useRef(score);
  const objectsConsumedRef = useRef(objectsConsumed);

  useEffect(() => { playerCirclesRef.current = playerCircles; }, [playerCircles]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { objectsConsumedRef.current = objectsConsumed; }, [objectsConsumed]);

  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F08080', '#20B2AA'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const generateFoodDot = (isEjected = false, x?: number, y?: number, size?: number, color?: string): FoodDot => {
    const dotSize = isEjected ? size || EJECTED_MASS_SIZE : Math.random() * 6 + 4;
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: x || Math.random() * WORLD_SIZE,
      y: y || Math.random() * WORLD_SIZE,
      size: dotSize,
      color: color || (isEjected ? '#FFFFFF' : getRandomColor()),
      points: isEjected ? 0 : Math.floor(dotSize), // Ejected mass gives no points
      isEjectedMass: isEjected,
    };
  };

  const generateAIOpponent = (): Circle => {
    const size = Math.random() * 20 + INITIAL_PLAYER_SIZE * 0.5;
    return {
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      size,
      color: getRandomColor(),
      isAI: true,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      lastChangedDirection: Date.now(),
    };
  };

  const createParticles = (x: number, y: number, color: string, count = 5) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: Math.random().toString(),
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        opacity: new Animated.Value(1),
        scale: new Animated.Value(1),
        color,
      };
      newParticles.push(particle);
      Animated.parallel([
        Animated.timing(particle.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(particle.scale, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        setParticles(prev => prev.filter(p => p.id !== particle.id));
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const initializeGame = useCallback(() => {
    setFoodDots(Array.from({ length: MAX_FOOD_DOTS }, () => generateFoodDot(false)));
    setAiOpponents(Array.from({ length: MAX_AI_OPPONENTS }, generateAIOpponent));
    setPlayerCircles([{
      id: 'player-0',
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
      size: INITIAL_PLAYER_SIZE,
      color: '#00D4AA',
      isPlayer: true,
      canMergeAt: 0,
    }]);
    setScore(0);
    setObjectsConsumed(0);
    setGameTime(0);
    gameTimeRef.current = 0;
    joystickDirection.current = { x: 0, y: 0 };
    playerScale.setValue(1);
  }, []);

  useEffect(() => {
    if (gameStarted && !gamePaused) {
      initializeGame();
    }
  }, [gameStarted, gamePaused, initializeGame]);

  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (gameStarted && !gamePaused) {
      timerInterval = setInterval(() => {
        gameTimeRef.current += 1;
        setGameTime(gameTimeRef.current);
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [gameStarted, gamePaused]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const touchY = evt.nativeEvent.pageY;
        if (touchY < 150 || touchY > screenHeight - 100) return false; // Avoid top/bottom UI
        return true;
      },
      onMoveShouldSetPanResponder: (evt) => {
        const touchY = evt.nativeEvent.pageY;
        if (touchY < 150 || touchY > screenHeight - 100) return false;
        return true;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!gameStarted || gamePaused) return;
        const { dx, dy } = gestureState;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 5) { // Reduced threshold for responsiveness
          const angle = Math.atan2(dy, dx);
          joystickDirection.current.x = Math.cos(angle);
          joystickDirection.current.y = Math.sin(angle);
        }
      },
      onPanResponderRelease: () => {
        // Optionally stop or keep moving
      },
    })
  ).current;

  const handleSplit = () => {
    if (gamePaused || playerCirclesRef.current.length >= MAX_PLAYER_CIRCLES) return;

    setPlayerCircles(prevCircles => {
      const newCircles: PlayerCircle[] = [];
      let canSplit = false;
      prevCircles.forEach(circle => {
        if (circle.size >= MIN_PLAYER_SIZE_TO_SPLIT && prevCircles.length + newCircles.length < MAX_PLAYER_CIRCLES) {
          canSplit = true;
          const newSize = circle.size / 2;
          const splitAngle = Math.atan2(joystickDirection.current.y, joystickDirection.current.x);
          const offsetX = Math.cos(splitAngle) * circle.size * SPLIT_DISTANCE_FACTOR;
          const offsetY = Math.sin(splitAngle) * circle.size * SPLIT_DISTANCE_FACTOR;

          newCircles.push({
            ...circle,
            id: `${circle.id}-split-${Date.now()}`,
            size: newSize,
            x: circle.x + offsetX,
            y: circle.y + offsetY,
            canMergeAt: Date.now() + MERGE_DELAY,
          });
          circle.size = newSize;
          circle.x -= offsetX / 4; // Recoil slightly
          circle.y -= offsetY / 4;
          circle.canMergeAt = Date.now() + MERGE_DELAY;
        }
      });
      return canSplit ? [...prevCircles, ...newCircles] : prevCircles;
    });
  };

  const handleEjectMass = () => {
    if (gamePaused) return;
    let totalEjected = 0;
    setPlayerCircles(prevCircles => 
      prevCircles.map(circle => {
        if (circle.size > MIN_PLAYER_SIZE_TO_EJECT && totalEjected < 5) { // Limit ejections per press
          totalEjected++;
          const ejectAngle = Math.atan2(joystickDirection.current.y, joystickDirection.current.x);
          const ejectX = circle.x + Math.cos(ejectAngle) * (circle.size / 2 + EJECTED_MASS_SIZE);
          const ejectY = circle.y + Math.sin(ejectAngle) * (circle.size / 2 + EJECTED_MASS_SIZE);
          
          setFoodDots(prevFood => [...prevFood, generateFoodDot(true, ejectX, ejectY, EJECTED_MASS_SIZE, circle.color)]);
          return { ...circle, size: circle.size - EJECTED_MASS_COST };
        }
        return circle;
      }).filter(c => c.size > 5) // Remove if too small after ejecting
    );
  };

  // Game Loop
  useEffect(() => {
    if (!gameStarted || gamePaused) return;

    const gameLoopInterval = setInterval(() => {
      // Player circles movement & merging
      setPlayerCircles(prevCircles => {
        let movedCircles = prevCircles.map(pCircle => {
          const speed = INITIAL_PLAYER_SPEED * (INITIAL_PLAYER_SIZE / pCircle.size) * 2.5 + 0.5;
          let newX = pCircle.x + joystickDirection.current.x * speed;
          let newY = pCircle.y + joystickDirection.current.y * speed;
          newX = Math.max(pCircle.size / 2, Math.min(WORLD_SIZE - pCircle.size / 2, newX));
          newY = Math.max(pCircle.size / 2, Math.min(WORLD_SIZE - pCircle.size / 2, newY));
          return { ...pCircle, x: newX, y: newY };
        });

        // Attempt to merge player circles
        const mergedCircles: PlayerCircle[] = [];
        const consumedIndices = new Set<number>();

        for (let i = 0; i < movedCircles.length; i++) {
          if (consumedIndices.has(i)) continue;
          let currentCircle = { ...movedCircles[i] };
          for (let j = i + 1; j < movedCircles.length; j++) {
            if (consumedIndices.has(j)) continue;
            const otherCircle = movedCircles[j];
            const dist = Math.hypot(currentCircle.x - otherCircle.x, currentCircle.y - otherCircle.y);
            const now = Date.now();

            if (dist < (currentCircle.size / 2 + otherCircle.size / 2) * 0.8 && // Overlap enough
                (currentCircle.canMergeAt || 0) < now && (otherCircle.canMergeAt || 0) < now) {
              // Merge: combine sizes, weighted average position
              const totalSize = currentCircle.size + otherCircle.size;
              currentCircle.x = (currentCircle.x * currentCircle.size + otherCircle.x * otherCircle.size) / totalSize;
              currentCircle.y = (currentCircle.y * currentCircle.size + otherCircle.y * otherCircle.size) / totalSize;
              currentCircle.size = totalSize;
              currentCircle.canMergeAt = Date.now() + MERGE_DELAY; // Prevent immediate re-split/merge issues
              consumedIndices.add(j);
            }
          }
          mergedCircles.push(currentCircle);
        }
        return mergedCircles;
      });

      // AI movement (remains largely the same)
      setAiOpponents(prevAIs => {
        const currentPlayers = playerCirclesRef.current;
        return prevAIs.map(ai => {
          let { x, y, size, targetX, targetY, lastChangedDirection } = ai;
          const aiSpeed = INITIAL_PLAYER_SPEED * (INITIAL_PLAYER_SIZE / size) * 1.5 + 0.3;
          
          let closestPlayerThreat: PlayerCircle | null = null;
          let closestPlayerFood: PlayerCircle | null = null;
          let minDistThreat = Infinity;
          let minDistFood = Infinity;

          currentPlayers.forEach(pCircle => {
            const distToPlayer = Math.hypot(pCircle.x - x, pCircle.y - y);
            if (pCircle.size > size * 1.2 && distToPlayer < minDistThreat) {
              minDistThreat = distToPlayer;
              closestPlayerThreat = pCircle;
            }
            if (size > pCircle.size * 1.2 && distToPlayer < minDistFood) {
              minDistFood = distToPlayer;
              closestPlayerFood = pCircle;
            }
          });

          if (closestPlayerThreat && minDistThreat < 200) {
            const angleAway = Math.atan2(y - closestPlayerThreat.y, x - closestPlayerThreat.x);
            targetX = x + Math.cos(angleAway) * 300;
            targetY = y + Math.sin(angleAway) * 300;
            lastChangedDirection = Date.now();
          } else if (closestPlayerFood && minDistFood < 250) {
            targetX = closestPlayerFood.x;
            targetY = closestPlayerFood.y;
            lastChangedDirection = Date.now();
          } else if (!targetX || !targetY || Date.now() - (lastChangedDirection || 0) > 3000) {
            targetX = Math.random() * WORLD_SIZE;
            targetY = Math.random() * WORLD_SIZE;
            lastChangedDirection = Date.now();
          }

          const angleToTarget = Math.atan2(targetY - y, targetX - x);
          const vx = Math.cos(angleToTarget) * aiSpeed;
          const vy = Math.sin(angleToTarget) * aiSpeed;
          x += vx; y += vy;
          x = Math.max(size / 2, Math.min(WORLD_SIZE - size / 2, x));
          y = Math.max(size / 2, Math.min(WORLD_SIZE - size / 2, y));
          return { ...ai, x, y, vx, vy, targetX, targetY, lastChangedDirection };
        });
      });

      // Collision: Player Circles vs Food
      setFoodDots(prevDots => {
        const currentPlayers = playerCirclesRef.current;
        const currentScore = scoreRef.current;
        const currentConsumed = objectsConsumedRef.current;
        let scoreIncrease = 0;
        let consumedIncrease = 0;
        let playerGrowthMap = new Map<string, number>(); // Track growth for each player circle

        const remainingDots = prevDots.filter(dot => {
          for (const pCircle of currentPlayers) {
            const distance = Math.hypot(pCircle.x - dot.x, pCircle.y - dot.y);
            if (distance < pCircle.size / 2 + dot.size / 2) {
              if (!dot.isEjectedMass) { // Only score for non-ejected food
                scoreIncrease += dot.points;
                consumedIncrease++;
              }
              playerGrowthMap.set(pCircle.id, (playerGrowthMap.get(pCircle.id) || 0) + dot.size * 0.1);
              createParticles(dot.x, dot.y, dot.color, 3);
              return false; // Consumed by one of the player circles
            }
          }
          return true;
        });

        if (playerGrowthMap.size > 0) {
          setPlayerCircles(prevPCircles => 
            prevPCircles.map(pc => 
              playerGrowthMap.has(pc.id) ? { ...pc, size: pc.size + (playerGrowthMap.get(pc.id) || 0) } : pc
            )
          );
          setScore(currentScore + scoreIncrease);
          setObjectsConsumed(currentConsumed + consumedIncrease);
          Animated.sequence([
            Animated.timing(playerScale, { toValue: 1.05, duration: 80, useNativeDriver: true }),
            Animated.timing(playerScale, { toValue: 1, duration: 80, useNativeDriver: true }),
          ]).start();
        }
        while (remainingDots.length < MAX_FOOD_DOTS) {
          remainingDots.push(generateFoodDot(false));
        }
        return remainingDots;
      });
      
      // Collision: Player Circles vs AI
      const currentPlayers = playerCirclesRef.current;
      let playerCirclesWereEaten = false;
      
      setAiOpponents(prevAIs => {
        let updatedAIs = [...prevAIs];
        let aisToRemove: string[] = [];
        
        currentPlayers.forEach(pCircle => {
          updatedAIs = updatedAIs.filter(ai => {
            const dist = Math.hypot(pCircle.x - ai.x, pCircle.y - ai.y);
            if (dist < pCircle.size / 2 + ai.size / 2) {
              if (pCircle.size > ai.size * 1.1) {
                setPlayerCircles(prevPC => prevPC.map(pc => pc.id === pCircle.id ? {...pc, size: pc.size + ai.size * 0.25} : pc));
                setScore(s => s + Math.floor(ai.size));
                createParticles(ai.x, ai.y, ai.color, 8);
                aisToRemove.push(ai.id); // Mark AI for removal, but filter later
                return false; // AI eaten
              } else if (ai.size > pCircle.size * 1.1) {
                setPlayerCircles(prevPC => prevPC.filter(pc => pc.id !== pCircle.id));
                createParticles(pCircle.x, pCircle.y, pCircle.color, 10);
                if (playerCirclesRef.current.length === 1 && playerCirclesRef.current[0].id === pCircle.id) {
                    playerCirclesWereEaten = true; // Last player circle eaten
                }
                return true; // AI survives, player circle removed
              }
            }
            return true; // No collision or no one ate
          });
        });
        
        updatedAIs = updatedAIs.filter(ai => !aisToRemove.includes(ai.id));
        while (updatedAIs.length < MAX_AI_OPPONENTS) {
          updatedAIs.push(generateAIOpponent());
        }
        return updatedAIs;
      });

      if (playerCirclesWereEaten || playerCirclesRef.current.length === 0) {
        resetGame(true);
        return;
      }

      // AI vs Food (simplified, remains similar)
      setFoodDots(prevFood => {
        let remainingFood = [...prevFood];
        setAiOpponents(prevAIs => 
          prevAIs.map(ai => {
            let aiGrowth = 0;
            remainingFood = remainingFood.filter(dot => {
              const dist = Math.hypot(ai.x - dot.x, ai.y - dot.y);
              if (dist < ai.size / 2 + dot.size / 2) {
                aiGrowth += dot.size * 0.1;
                return false;
              }
              return true;
            });
            return { ...ai, size: ai.size + aiGrowth };
          })
        );
        while (remainingFood.length < MAX_FOOD_DOTS) {
          remainingFood.push(generateFoodDot(false));
        }
        return remainingFood;
      });

    }, 50); // 20 FPS

    return () => clearInterval(gameLoopInterval);
  }, [gameStarted, gamePaused]);

  useEffect(() => {
    // Calculate camera offset based on the average position of player circles or the largest one
    if (playerCirclesRef.current.length > 0) {
        const mainPlayerCircle = playerCirclesRef.current.reduce((largest, current) => 
            current.size > largest.size ? current : largest, playerCirclesRef.current[0]
        );
        cameraOffset.current = {
            x: mainPlayerCircle.x - screenWidth / 2,
            y: mainPlayerCircle.y - screenHeight / 2
        };
    } else if (gameStarted) { // If no player circles and game was started, center on world (or last known pos)
        cameraOffset.current = {
            x: WORLD_SIZE / 2 - screenWidth / 2,
            y: WORLD_SIZE / 2 - screenHeight / 2
        };
    }
  }, [playerCircles, gameStarted]);

  const togglePause = () => setGamePaused(!gamePaused);

  const resetGame = async (gameOver = false) => {
    const totalPlayerSize = playerCirclesRef.current.reduce((sum, pc) => sum + pc.size, 0);
    if (gameStarted && !gameOver) {
      await updateGameStats(scoreRef.current, objectsConsumedRef.current, totalPlayerSize, Math.floor(gameTimeRef.current / 60));
    }
    setGameStarted(false);
    setGamePaused(false);
    setParticles([]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCircle = (circle: Circle) => {
    const { x: camX, y: camY } = cameraOffset.current;
    const screenX = circle.x - circle.size / 2 - camX;
    const screenY = circle.y - circle.size / 2 - camY;
    
    if (screenX + circle.size < -50 || screenX > screenWidth + 50 || 
        screenY + circle.size < -50 || screenY > screenHeight + 50) {
      return null;
    }
    
    return (
      <Animated.View
        key={circle.id}
        style={[
          styles.circle,
          {
            left: screenX,
            top: screenY,
            width: circle.size,
            height: circle.size,
            borderRadius: circle.size / 2,
            backgroundColor: circle.color,
            transform: circle.isPlayer ? [{ scale: playerScale }] : [],
            zIndex: circle.isPlayer ? 10 : (circle.isAI ? 5 : 3), // Player on top, then AI, then ejected mass
          },
        ]}
      >
        {circle.isPlayer && <View style={styles.playerCore} />}
      </Animated.View>
    );
  };

  const renderFoodDot = (dot: FoodDot) => {
    const { x: camX, y: camY } = cameraOffset.current;
    const screenX = dot.x - dot.size / 2 - camX;
    const screenY = dot.y - dot.size / 2 - camY;
    
    if (screenX + dot.size < -10 || screenX > screenWidth + 10 || 
        screenY + dot.size < -10 || screenY > screenHeight + 10) {
      return null;
    }
    
    return (
      <View
        key={dot.id}
        style={[
          styles.foodDot,
          {
            left: screenX,
            top: screenY,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: dot.color,
            opacity: dot.isEjectedMass ? 0.7 : 1, // Ejected mass slightly transparent
          },
        ]}
      />
    );
  };

  const renderParticle = (particle: Particle) => {
    const { x: camX, y: camY } = cameraOffset.current;
    return (
      <Animated.View
        key={particle.id}
        style={[
          styles.particle,
          {
            left: particle.x - camX,
            top: particle.y - camY,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            transform: [{ scale: particle.scale }],
          },
        ]}
      />
    );
  };

  const totalPlayerSize = playerCirclesRef.current.reduce((sum, pc) => sum + pc.size, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.gameArea}
        {...panResponder.panHandlers}
      >
        {gameStarted && (
          <>
            {foodDots.map(renderFoodDot)}
            {aiOpponents.map(renderCircle)}
            {playerCircles.map(renderCircle)}
            {particles.map(renderParticle)}
          </>
        )}
      </LinearGradient>

      <View style={styles.uiOverlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.statBox} pointerEvents="auto">
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{score.toLocaleString()}</Text>
          </View>
          <View style={styles.statBox} pointerEvents="auto">
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{formatTime(gameTime)}</Text>
          </View>
          <View style={styles.statBox} pointerEvents="auto">
            <Text style={styles.statLabel}>Size</Text>
            <Text style={styles.statValue}>{Math.floor(totalPlayerSize)}</Text>
          </View>
        </View>

        {gameStarted && (
          <View style={styles.bottomControlsContainer} pointerEvents="box-none">
            <TouchableOpacity 
              style={[styles.actionButton, playerCirclesRef.current.every(c => c.size < MIN_PLAYER_SIZE_TO_SPLIT || playerCirclesRef.current.length >= MAX_PLAYER_CIRCLES) && styles.disabledButton]}
              onPress={handleSplit} 
              disabled={playerCirclesRef.current.every(c => c.size < MIN_PLAYER_SIZE_TO_SPLIT || playerCirclesRef.current.length >= MAX_PLAYER_CIRCLES)}
              pointerEvents="auto"
            >
              <Zap color="#FFFFFF" size={24} />
              <Text style={styles.actionButtonText}>Split</Text>
            </TouchableOpacity>
            
            <View style={styles.mainControls} pointerEvents="box-none">
                <TouchableOpacity style={styles.controlButton} onPress={togglePause} pointerEvents="auto">
                {gamePaused ? <Play color="#FFFFFF" size={24} /> : <Pause color="#FFFFFF" size={24} />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={() => resetGame(false)} pointerEvents="auto">
                <RotateCcw color="#FFFFFF" size={24} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.actionButton, playerCirclesRef.current.every(c => c.size < MIN_PLAYER_SIZE_TO_EJECT) && styles.disabledButton]}
              onPress={handleEjectMass} 
              disabled={playerCirclesRef.current.every(c => c.size < MIN_PLAYER_SIZE_TO_EJECT)}
              pointerEvents="auto"
            >
              <TrendingDown color="#FFFFFF" size={24} />
              <Text style={styles.actionButtonText}>Eject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!gameStarted && (
        <View style={styles.startMessageContainer}>
          <Text style={styles.titleText}>AGAR.IO CLONE</Text>
          <Text style={styles.instructionText}>Drag on screen to set movement direction</Text>
          <Text style={styles.instructionText}>Consume dots and smaller players to grow!</Text>
          <TouchableOpacity style={styles.startButton} onPress={() => setGameStarted(true)}>
            <MoveRight color="#0F172A" size={32} />
            <Text style={styles.startButtonText}>START GAME</Text>
          </TouchableOpacity>
        </View>
      )}

      {gamePaused && gameStarted && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseText}>GAME PAUSED</Text>
          <TouchableOpacity style={styles.resumeButton} onPress={togglePause}>
            <Play color="#FFFFFF" size={32} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameArea: {
    flex: 1,
    overflow: 'hidden',
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    paddingTop: 50,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  statLabel: {
    color: '#A0AEC0',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 3,
  },
  bottomControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  mainControls: {
    flexDirection: 'row',
    gap: 15,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 212, 170, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    height: 55,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  disabledButton: {
    backgroundColor: 'rgba(100, 100, 100, 0.5)',
  },
  startMessageContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    zIndex: 2000,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 212, 170, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instructionText: {
    color: '#CBD5E0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#00D4AA',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 30,
    alignItems: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  startButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    zIndex: 1500,
  },
  pauseText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  resumeButton: {
    backgroundColor: 'rgba(0, 212, 170, 0.9)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  circle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  playerCore: {
    position: 'absolute',
    top: '30%',
    left: '30%',
    width: '40%',
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 999,
  },
  foodDot: {
    position: 'absolute',
    zIndex: 2,
  },
});
