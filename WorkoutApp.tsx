import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  Platform,
  Alert,
  SafeAreaView,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { LineChart } from 'react-native-chart-kit';
import LottieView from 'lottie-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AGiXTService, {
  WorkoutPlanResponse,
  Challenge,
  Supplement,
  MealPlan,
  CustomExercise,
  WorkoutFeedback,
  FeedbackAnalysis,
  AdaptiveWorkoutPlan,
  AnomalyDetectionResult,
  PersonalizedRecommendation,
  FitnessForecast,
  WorkoutPreferences,
  UserProfile,
  SocialChallenge,
  ProgressReport,
  BodyMeasurements
} from './AGiXTService'; 
import HealthConnect, {
  RecordType,
  SdkAvailabilityStatus,
  ReadRecordsOptions,
} from 'react-native-health-connect';
import BackgroundFetch, { BackgroundFetchResult } from 'react-native-background-fetch';

const { width, height } = Dimensions.get('window');
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Interfaces
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface LoadingOverlayProps {
  isVisible: boolean;
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

interface DashboardTabProps {
  userProfile: UserProfile;
  workoutPlan: WorkoutPlanResponse | null;
  points: number;
  motivationalQuote: string;
  refreshQuote: () => Promise<void>;
  onEditProfile: () => void; 
  onOpenSettings: () => void; 
}

interface WorkoutTabProps {
  workoutPlan: WorkoutPlanResponse[];
  onGenerateWorkout: (bodyPart: string | null) => void;
  onCompleteWorkout: (difficulty: 'easy' | 'just right' | 'hard') => Promise<void>;
  workoutPreferences: WorkoutPreferences | null;
}

interface NutritionTabProps {
  mealPlan: MealPlan | null;
  onUpdateMealPlan: () => Promise<void>;
}

interface ProgressTabProps {
  bmiHistory: { date: string; bmi: number }[];
  progressReport: ProgressReport | null;
  onCalculateBMI: () => void;
  onGenerateReport: () => Promise<void>;
}

interface ChallengesTabProps {
  challenges: Challenge[];
  onCompleteChallenge: (challengeId: number) => Promise<void>;
  onRefreshChallenges: () => Promise<void>;
}

interface SocialTabProps {
  socialChallenges: SocialChallenge[];
  onCreateChallenge: (details: Partial<SocialChallenge>) => Promise<void>;
  onJoinChallenge: (challengeId: string) => Promise<void>;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

// Interface for AGiXT Workout Analysis Response
interface WorkoutAnalysis {
  recommendation: string;
  warning: boolean;
}

// Components
const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Something went wrong. Please restart the app.</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );
};

const AlertModal: React.FC<AlertModalProps> = React.memo(({ visible, title, message, onClose }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.alertModalContainer}>
      <View style={styles.alertModalContent}>
        <Text style={styles.alertModalTitle}>{title}</Text>
        <Text style={styles.alertModalMessage}>{message}</Text>
        <TouchableOpacity style={styles.alertModalButton} onPress={onClose}>
          <Text style={styles.alertModalButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

const LevelProgressBar: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const progress = (userProfile.experiencePoints % 100) / 100;
  return (
    <View style={styles.levelProgressContainer}>
      <Text style={styles.levelText}>Level {userProfile.level}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>{userProfile.experiencePoints % 100} / 100 XP</Text>
    </View>
  );
};

const AchievementsModal: React.FC<{ visible: boolean; onClose: () => void; userProfile: UserProfile; achievements: Achievement[] }> = ({ visible, onClose, userProfile, achievements }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>Achievements</Text>
          <FlatList
            data={achievements}
            renderItem={({ item }) => (
              <View style={styles.achievementItem}>
                <Image source={{ uri: item.icon }} style={styles.achievementIcon} />
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{item.name}</Text>
                  <Text style={styles.achievementDescription}>{item.description}</Text>
                </View>
                {userProfile.unlockedAchievements.includes(item.id) && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </View>
            )}
            keyExtractor={item => item.id}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [displayText, setDisplayText] = useState('');
  const [settingsModalVisible, setSettingsModalVisible] = useState(true); 
  const [apiKey, setApiKey] = useState('');
  const [apiUri, setApiUri] = useState('');

  const fullText = 'Welcome to AGiXT Workouts';

  useEffect(() => {
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, []);

  const handleSaveSettings = async () => {
    if (!apiKey.trim() || !apiUri.trim()) {
      // Handle invalid input (e.g., show an error message)
      return;
    }

    try {
      await AsyncStorage.setItem('apiKey', apiKey);
      await AsyncStorage.setItem('apiUri', apiUri);

      navigation.navigate('WorkoutSelection');
      setSettingsModalVisible(false);
    } catch (error) {
      // Handle error saving settings (e.g., show an error message)
    }
  };

  return (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeTitle}>{displayText}</Text>

      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>AGiXT Settings</Text>
            <TextInput
              style={styles.input}
              placeholder="API Key"
              value={apiKey}
              onChangeText={setApiKey}
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={styles.input}
              placeholder="API URI"
              value={apiUri}
              onChangeText={setApiUri}
              placeholderTextColor="#ccc"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleSaveSettings}>
              <Text style={styles.modalButtonText}>Save Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSettingsModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const WorkoutSelectionScreen: React.FC<{ navigation: any; onComplete: (preferences: WorkoutPreferences) => void }> = ({ navigation, onComplete }) => {
  const [preferences, setPreferences] = useState<WorkoutPreferences>({
    location: '',
    space: '',
    equipment: [],
  });

  const handleSelection = (key: keyof WorkoutPreferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: key === 'equipment' 
        ? prev.equipment.includes(value)
          ? prev.equipment.filter(item => item !== value)
          : [...prev.equipment, value]
        : value
    }));
  };

  const handleComplete = () => {
    onComplete(preferences);
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>Where will you be working out?</Text>
      {['Home', 'Gym', 'Outdoors'].map(option => (
        <TouchableOpacity
          key={option}
          style={[styles.optionButton, preferences.location === option && styles.selectedOption]}
          onPress={() => handleSelection('location', option)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.questionText}>What equipment do you have?</Text>
      {['Dumbbells', 'Barbell', 'Resistance Bands', 'None'].map(option => (
        <TouchableOpacity
          key={option}
          style={[styles.optionButton, preferences.equipment.includes(option) && styles.selectedOption]}
          onPress={() => handleSelection('equipment', option)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.generateWorkoutButton} onPress={handleComplete}>
        <Text style={styles.generateWorkoutButtonText}>Generate Workout</Text>
      </TouchableOpacity>
    </View>
  );
};

// Tab Components
const DashboardTab: React.FC<DashboardTabProps> = ({ userProfile, workoutPlan, points, motivationalQuote, refreshQuote, onEditProfile, onOpenSettings }) => {
  const animatedScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ScrollView style={styles.dashboardContainer}>
      <LinearGradient colors={['#000', '#1a1a1a']} style={styles.gradient}>
        <View style={styles.dashboardHeader}>
          <TouchableOpacity onPress={onEditProfile}>
            <Image source={{ uri: userProfile.profileImage || 'https://via.placeholder.com/100' }} style={styles.profileImage} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
        <View style={styles.topSection}>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.points}>{points} Points</Text>
          <LevelProgressBar userProfile={userProfile} />
        </View>

        {workoutPlan && (
          <Animated.View style={[styles.workoutCard, { transform: [{ scale: animatedScale }] }]}>
            <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1} onPress={() => { /* Navigate to workout screen */ }}>
              <Text style={styles.cardTitle}>Today's Workout</Text>
              <Text style={styles.workoutName}>{workoutPlan.workoutPlan.weeklyPlan[0].day}</Text>
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>{motivationalQuote}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshQuote}>
            <Ionicons name="refresh-outline" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 150, height: 150, overflow: 'hidden', alignSelf: 'center' }}>
        <LottieView
  source={require('./assets/animations/exercise.json')} // Replace with your actual animation file
  autoPlay
  loop
  style={{
    width: 150,
    height: 150,
    transform: [{ scale: 0.5 }]
  }}
  resizeMode="cover"
  speed={1}
/>
</View>
      </LinearGradient>
    </ScrollView>
  );
};

const WorkoutTab: React.FC<WorkoutTabProps> = ({ workoutPlan, onGenerateWorkout, onCompleteWorkout, workoutPreferences }) => {
  const [bodyPartModalVisible, setBodyPartModalVisible] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);

  const renderWorkoutItem = ({ item }: { item: WorkoutPlanResponse }) => (
    <View style={styles.workoutCard}>
      <Text style={styles.cardTitle}>{item.workoutPlan.weeklyPlan[0].day}</Text>
      {item.workoutPlan.weeklyPlan[0].exercises.map((exercise, index) => (
        <View key={index} style={styles.exerciseItem}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDetail}>Sets: {exercise.sets}</Text>
          <Text style={styles.exerciseDetail}>Reps: {exercise.reps}</Text>
          <Text style={styles.exerciseDetail}>Rest: {exercise.rest}</Text>
          {exercise.text && <Text style={styles.exerciseDetail}>{exercise.text}</Text>}
        </View>
      ))}
      <TouchableOpacity style={styles.completeWorkoutButton} onPress={() => onCompleteWorkout('just right')}>
        <Text style={styles.completeWorkoutButtonText}>Complete Workout</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    // Check if workoutPlan is empty and preferences are set
    if (workoutPlan.length === 0 && workoutPreferences) {
      onGenerateWorkout(null); // Generate initial workouts without a specific body part
    }
  }, [workoutPlan, workoutPreferences, onGenerateWorkout]); 

  const handleGenerateWorkout = () => {
    setBodyPartModalVisible(true);
  };

  const handleBodyPartSelect = (bodyPart: string) => {
    setSelectedBodyPart(bodyPart);
    onGenerateWorkout(bodyPart); 
  };

  return (
    <>
      <FlatList
        data={workoutPlan}
        renderItem={renderWorkoutItem}
        keyExtractor={(item, index) => `${item.conversationName}-${index}`}
        ListHeaderComponent={<Text style={styles.tabTitle}>Workouts</Text>}
        ListEmptyComponent={
          <TouchableOpacity style={styles.generateWorkoutButton} onPress={handleGenerateWorkout}>
            <Text style={styles.generateWorkoutButtonText}>Generate Workout Plans</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.workoutTabContent}
      />

      {/* Body Part Modal */}
      <BodyPartModal 
        visible={bodyPartModalVisible} 
        onClose={() => setBodyPartModalVisible(false)} 
        onSelect={handleBodyPartSelect} 
      />
    </>
  );
};

const BodyPartModal: React.FC<{ 
  visible: boolean; 
  onClose: () => void; 
  onSelect: (bodyPart: string) => void; 
}> = ({ visible, onClose, onSelect }) => {
  const bodyParts = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>What do you want to work on today?</Text>
          {bodyParts.map(bodyPart => (
            <TouchableOpacity 
              key={bodyPart} 
              style={styles.bodyPartOption} 
              onPress={() => {
                onSelect(bodyPart);
                onClose();
              }}
            >
              <Text style={styles.bodyPartOptionText}>{bodyPart}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const NutritionTab: React.FC<NutritionTabProps> = ({ mealPlan, onUpdateMealPlan }) => {
  return (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.tabTitle}>Nutrition</Text>
      {mealPlan ? (
        <View style={styles.mealPlanContainer}>
          <Text style={styles.sectionTitle}>Today's Meal Plan</Text>
          <Text style={styles.mealTitle}>Breakfast:</Text>
          <Text style={styles.mealContent}>{mealPlan.breakfast}</Text>
          <Text style={styles.mealTitle}>Lunch:</Text>
          <Text style={styles.mealContent}>{mealPlan.lunch}</Text>
          <Text style={styles.mealTitle}>Dinner:</Text>
          <Text style={styles.mealContent}>{mealPlan.dinner}</Text>
          <Text style={styles.mealTitle}>Snacks:</Text>
          {mealPlan.snacks.map((snack: string, index: number) => (
            <Text key={index} style={styles.mealContent}>{snack}</Text>
          ))}
          <TouchableOpacity style={styles.updateMealPlanButton} onPress={onUpdateMealPlan}>
            <Text style={styles.updateMealPlanButtonText}>Update Meal Plan</Text>
          </TouchableOpacity>
        </View>
        ) : (
          <TouchableOpacity style={styles.generateMealPlanButton} onPress={onUpdateMealPlan}>
            <Text style={styles.generateMealPlanButtonText}>Generate Meal Plan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };
  
  const ProgressTab: React.FC<ProgressTabProps> = ({ bmiHistory, progressReport, onCalculateBMI, onGenerateReport }) => {
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.tabTitle}>Progress</Text>
        <TouchableOpacity style={styles.calculateBMIButton} onPress={onCalculateBMI}>
          <Text style={styles.calculateBMIButtonText}>Calculate BMI</Text>
        </TouchableOpacity>
        {bmiHistory.length > 0 && (
          <View style={styles.bmiChartContainer}>
            <Text style={styles.sectionTitle}>BMI History</Text>
            <LineChart
              data={{
                labels: bmiHistory.map((entry) => new Date(entry.date).toLocaleDateString()),
                datasets: [{ data: bmiHistory.map((entry) => entry.bmi) }]
              }}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#e26a00',
                backgroundGradientFrom: '#fb8c00',
                backgroundGradientTo: '#ffa726',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                  borderRadius: 16
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}
        <TouchableOpacity style={styles.generateReportButton} onPress={onGenerateReport}>
          <Text style={styles.generateReportButtonText}>Generate Progress Report</Text>
        </TouchableOpacity>
        {progressReport && (
          <View style={styles.progressReportContainer}>
            <Text style={styles.sectionTitle}>Progress Report</Text>
            <Text style={styles.progressReportContent}>{progressReport.summary}</Text>
            <Text style={styles.progressReportSubtitle}>Workout Progress:</Text>
            <Text style={styles.progressReportContent}>Total Workouts: {progressReport.workoutProgress.totalWorkouts}</Text>
            <Text style={styles.progressReportContent}>Average Difficulty: {progressReport.workoutProgress.averageDifficulty.toFixed(1)}</Text>
            <Text style={styles.progressReportContent}>Most Improved Exercises: {progressReport.workoutProgress.mostImprovedExercises.join(', ')}</Text>
            <Text style={styles.progressReportSubtitle}>Body Composition Changes:</Text>
            <Text style={styles.progressReportContent}>Weight Change: {progressReport.bodyCompositionChanges.weightChange} lbs</Text>
            <Text style={styles.progressReportContent}>Body Fat Percentage Change: {progressReport.bodyCompositionChanges.bodyFatPercentageChange}%</Text>
            <Text style={styles.progressReportSubtitle}>Recommendations:</Text>
            {progressReport.recommendations.map((recommendation, index) => (
              <Text key={index} style={styles.progressReportContent}>\u2022 {recommendation}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };
  
  const ChallengesTab: React.FC<ChallengesTabProps> = ({ challenges, onCompleteChallenge, onRefreshChallenges }) => {
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.tabTitle}>Challenges</Text>
        {challenges.map((challenge: Challenge) => (
          <View key={challenge.id} style={styles.challengeItem}>
            <Text style={styles.challengeName}>{challenge.name}</Text>
            <Text style={styles.challengeDescription}>{challenge.description}</Text>
            <Text style={styles.challengeDuration}>Duration: {challenge.duration}</Text>
            <Text style={styles.challengeDifficulty}>Difficulty: {challenge.difficulty}</Text>
            <TouchableOpacity
              style={[styles.challengeButton, challenge.completed && styles.challengeCompleted]}
              onPress={() => onCompleteChallenge(challenge.id)}
              disabled={challenge.completed}
            >
              <Text style={styles.challengeButtonText}>
                {challenge.completed ? 'Completed' : 'Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.refreshChallengesButton} onPress={onRefreshChallenges}>
          <Text style={styles.refreshChallengesButtonText}>Refresh Challenges</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
  
  const SocialTab: React.FC<SocialTabProps> = ({ socialChallenges, onCreateChallenge, onJoinChallenge }) => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabTitle}>Social Challenges</Text>
        <FlatList
          data={socialChallenges}
          renderItem={({ item }) => (
            <View style={styles.challengeItem}>
              <Text style={styles.challengeName}>{item.challengeName}</Text>
              <Text style={styles.challengeDescription}>{item.description}</Text>
              <Text style={styles.challengeDates}>{`${item.startDate} - ${item.endDate}`}</Text>
              <TouchableOpacity style={styles.joinButton} onPress={() => onJoinChallenge(item.id)}>
                <Text style={styles.joinButtonText}>Join Challenge</Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={item => item.id}
        />
        <TouchableOpacity style={styles.createChallengeButton} onPress={() => onCreateChallenge({})}>
          <Text style={styles.createChallengeButtonText}>Create New Challenge</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Utility functions
  const updateStreak = (userProfile: UserProfile): UserProfile => {
    const today = new Date().toISOString().split('T')[0];
    const lastWorkout = new Date(userProfile.lastWorkoutDate);
    const diffDays = Math.floor((new Date(today).getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));
  
    let newStreak = userProfile.currentStreak;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  
    return {
      ...userProfile,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, userProfile.longestStreak),
      lastWorkoutDate: today
    };
  };
  
  const addExperiencePoints = (userProfile: UserProfile, points: number): UserProfile => {
    const newExperiencePoints = userProfile.experiencePoints + points;
    const newLevel = Math.floor(Math.sqrt(newExperiencePoints / 100)) + 1;
    return {
      ...userProfile,
      experiencePoints: newExperiencePoints,
      level: newLevel
    };
  };
  
  const awardCoins = (userProfile: UserProfile, amount: number): UserProfile => {
    return {
      ...userProfile,
      coins: userProfile.coins + amount
    };
  };
  
  const checkAchievements = (userProfile: UserProfile, stats: { totalWorkouts: number }): string[] => {
    const newAchievements: string[] = [];
    
    if (stats.totalWorkouts === 1 && !userProfile.unlockedAchievements.includes('first_workout')) {
      newAchievements.push('first_workout');
    }
    
    if (userProfile.currentStreak >= 7 && !userProfile.unlockedAchievements.includes('week_warrior')) {
      newAchievements.push('week_warrior');
    }
    
    // Add more achievement checks here
    
    return newAchievements;
  };
  
  // Main App Component
  const WorkoutApp: React.FC = () => {
    const [userProfile, setUserProfile] = useState<UserProfile>({
      name: '',
      age: '',
      gender: '',
      feet: '',
      inches: '',
      weight: '',
      goal: '',
      fitnessLevel: '',
      daysPerWeek: '',
      bio: '',
      interests: '',
      profileImage: null,
      level: 1,
      experiencePoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: '',
      coins: 0,
      unlockedAchievements: [],
      friends: [],
    });
    const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [points, setPoints] = useState(0);
    const [achievements, setAchievements] = useState<Achievement[]>([
      { id: 'first_workout', name: 'First Workout', description: 'Complete your first workout', icon: 'first_workout_icon', unlocked: false },
      { id: 'week_warrior', name: 'Week Warrior', description: 'Complete all workouts for a week', icon: 'week_warrior_icon', unlocked: false },
      { id: 'nutrition_master', name: 'Nutrition Master', description: 'Follow meal plan for a month', icon: 'nutrition_master_icon', unlocked: false },
      { id: 'challenge_champion', name: 'Challenge Champion', description: 'Complete 5 challenges', icon: 'challenge_champion_icon', unlocked: false },
      { id: 'bmi_improver', name: 'BMI Improver', description: 'Improve your BMI by 1 point', icon: 'bmi_improver_icon', unlocked: false },
    ]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [bmiHistory, setBmiHistory] = useState<{date: string, bmi: number}[]>([]);
    const [bmiModalVisible, setBmiModalVisible] = useState(false);
    const [currentWeight, setCurrentWeight] = useState('');
    const [challengesModalVisible, setChallengesModalVisible] = useState(false);
    const [supplementsModalVisible, setSupplementsModalVisible] = useState(false);
    const [mealPlanModalVisible, setMealPlanModalVisible] = useState(false);
    const [customExerciseModalVisible, setCustomExerciseModalVisible] = useState(false);
    const [customExerciseName, setCustomExerciseName] = useState('');
    const [customExerciseDescription, setCustomExerciseDescription] = useState('');
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiUri, setApiUri] = useState('');
    const [agixtService, setAgixtService] = useState<AGiXTService | null>(null);
    const [workoutFeedback, setWorkoutFeedback] = useState<WorkoutFeedback | null>(null);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [workoutPath, setWorkoutPath] = useState('');
    const [isFirstLaunch, setIsFirstLaunch] = useState(true);
    const [motivationalQuote, setMotivationalQuote] = useState('');
    const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [feedbackAnalysis, setFeedbackAnalysis] = useState<FeedbackAnalysis | null>(null);
    const [adaptiveWorkoutPlan, setAdaptiveWorkoutPlan] = useState<AdaptiveWorkoutPlan | null>(null);
    const [anomalyDetectionResult, setAnomalyDetectionResult] = useState<AnomalyDetectionResult | null>(null);
    const [personalizedRecommendation, setPersonalizedRecommendation] = useState<PersonalizedRecommendation | null>(null);
    const [fitnessForecast, setFitnessForecast] = useState<FitnessForecast[]>([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
    const [showWelcome, setShowWelcome] = useState(true);
    const [showWorkoutSelection, setShowWorkoutSelection] = useState(false);
    const [workoutPreferences, setWorkoutPreferences] = useState<WorkoutPreferences | null>(null);
    const [socialChallenges, setSocialChallenges] = useState<SocialChallenge[]>([]);
    const [achievementsModalVisible, setAchievementsModalVisible] = useState(false);
    const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
    const [bodyPartModalVisible, setBodyPartModalVisible] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [workoutAnalysis, setWorkoutAnalysis] = useState<WorkoutAnalysis | null>(null);
    const [recentActivities, setRecentActivities] = useState<any[]>([]); // Updated to any[]
    const [healthConnectAvailable, setHealthConnectAvailable] = useState(false);
    const [healthConnectPermissionsGranted, setHealthConnectPermissionsGranted] = useState(false);

  
    const showAlert = useCallback((title: string, message: string) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertModalVisible(true);
    }, []);
  
    useEffect(() => {
      const initializeApp = async () => {
        try {
          setLoading(true);

          // Get API Key and URI from AsyncStorage
          const storedApiKey = await AsyncStorage.getItem('apiKey');
          const storedApiUri = await AsyncStorage.getItem('apiUri');

          if (storedApiKey) {
            setApiKey(storedApiKey);
          }
          if (storedApiUri) {
            setApiUri(storedApiUri);
          }

          // Demo Mode Detection (activated when API URI is 'demo_api_uri')
          setIsDemoMode(apiUri === 'demo');

          const service = new AGiXTService(isDemoMode);
          service.updateSettings(apiUri, apiKey);
          await service.initializeWorkoutAgent();
          setAgixtService(service);
  
          const storedProfile = await AsyncStorage.getItem('userProfile');
          const storedWorkoutPath = await AsyncStorage.getItem('workoutPath');
          const storedWorkoutPlan = await AsyncStorage.getItem('currentWorkoutPlan');
          const storedPoints = await AsyncStorage.getItem('points');
          const storedWorkoutsCompleted = await AsyncStorage.getItem('workoutsCompleted');
  
          if (storedProfile && storedWorkoutPath && !isDemoMode) {
            setUserProfile(JSON.parse(storedProfile));
            setWorkoutPath(storedWorkoutPath);
            setIsFirstLaunch(false);
            if (storedWorkoutPlan) {
              setWorkoutPlan(JSON.parse(storedWorkoutPlan));
            }
          } else {
            setIsFirstLaunch(true);
            // Pre-populate user profile with dummy data for demo mode
            setUserProfile({
              name: 'Demo User',
              age: '30',
              gender: 'Male',
              feet: '5',
              inches: '10',
              weight: '170',
              goal: 'Muscle Building',
              fitnessLevel: 'Intermediate',
              daysPerWeek: '4',
              bio: 'This is a demo profile.',
              interests: 'Weightlifting, Running',
              profileImage: null,
              level: 1,
              experiencePoints: 0,
              currentStreak: 0,
              longestStreak: 0,
              lastWorkoutDate: '',
              coins: 0,
              unlockedAchievements: [],
              friends: [],
            });
            setWorkoutPath('Muscle Building');
            // Generate dummy workout plan for demo mode
            setWorkoutPlan([
              {
                conversationName: 'DemoWorkout_1',
                workoutPlan: {
                  weeklyPlan: [
                    {
                      day: 'Day 1 - Chest & Triceps',
                      focus: 'Strength', // Make sure to include 'focus'
                      exercises: [
                        { name: 'Bench Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                        { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                        { name: 'Dumbbell Flyes', sets: 3, reps: '10-15', rest: '60 seconds' },
                        { name: 'Close-Grip Bench Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                        { name: 'Triceps Pushdowns', sets: 3, reps: '12-15', rest: '60 seconds' },
                      ],
                    },
                  ],
                  nutritionAdvice: 'Eat plenty of protein and complex carbohydrates.',
                },
                completed: false,
                difficulty: 3,
              },
            ]);
          }
  
          if (storedPoints) setPoints(parseInt(storedPoints, 10)); // Use radix for parseInt
          if (storedWorkoutsCompleted) setWorkoutsCompleted(parseInt(storedWorkoutsCompleted, 10));
  
          await initializeFeatures();
        } catch (error) {
          console.error('Error initializing app:', error);
          showAlert('Error', 'Failed to initialize the app. Please restart.');
        } finally {
          setLoading(false);
        }
      };
  
      initializeApp();
    }, [apiUri]); // Add apiUri to the dependency array

    const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setUserProfile(prevProfile => ({ ...prevProfile, profileImage: result.assets[0].uri }));
      }
    };

  const handleEditProfile = () => {
    setProfileModalVisible(true);
  };

  const handleOpenSettings = () => {
    setSettingsModalVisible(true);
  };


  const loadMealPlan = useCallback(async () => {
    if (!agixtService) return;
    try {
      setLoading(true);
      const newMealPlan = await agixtService.getMealPlan(userProfile);
      setMealPlan(newMealPlan);
      await AsyncStorage.setItem('mealPlan', JSON.stringify(newMealPlan));
    } catch (error) {
      console.error('Error loading meal plan:', error);
      showAlert('Error', 'Failed to load meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, showAlert]);

  const loadChallenges = useCallback(async () => {
    if (!agixtService) return;
    try {
      setLoading(true);
      const storedChallenges = await AsyncStorage.getItem('challenges');
      if (storedChallenges) {
        setChallenges(JSON.parse(storedChallenges));
      } else {
        const newChallenges = await agixtService.getChallenges(userProfile);
        setChallenges(newChallenges);
        await AsyncStorage.setItem('challenges', JSON.stringify(newChallenges));
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      showAlert('Error', 'Failed to load challenges. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, showAlert]);

  const initializeFeatures = useCallback(async () => {
    if (!agixtService) {
      console.error('AGiXT Service is not initialized');
      return;
    }

    try {
      setLoading(true);
      if (userProfile.name && userProfile.age && userProfile.gender) {
        await loadChallenges();
        await loadMealPlan();

        const quote = await agixtService.getMotivationalQuote();
        setMotivationalQuote(quote);

        const report = await agixtService.getProgressReport(userProfile, [], []);
        setProgressReport(report);
      }
    } catch (error) {
      console.error('Error initializing features:', error);
      setError('Failed to initialize some features. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, loadChallenges, loadMealPlan]);

  const handleInputChange = useCallback((field: keyof UserProfile, value: string) => {
    setUserProfile(prevProfile => ({ ...prevProfile, [field]: value }));
  }, []);

  const checkAchievementsAndUpdateState = useCallback(() => {
    const newAchievements = [...achievements];
    if (!newAchievements[0].unlocked) {
      newAchievements[0].unlocked = true;
      showAlert('Achievement Unlocked', 'You completed your first workout!');
      setPoints(prevPoints => prevPoints + 50);
    }
    if (workoutsCompleted >= 7 && !newAchievements[1].unlocked) {
      newAchievements[1].unlocked = true;
      showAlert('Achievement Unlocked', 'You completed all workouts for a week!');
      setPoints(prevPoints => prevPoints + 100);
    }
    setAchievements(newAchievements);
    AsyncStorage.setItem('achievements', JSON.stringify(newAchievements));
    AsyncStorage.setItem('points', points.toString());
  }, [achievements, workoutsCompleted, showAlert, points]);

  const generateWorkouts = useCallback(async (preferences: WorkoutPreferences, bodyPart: string | null = null) => {
    if (!agixtService) {
      showAlert('Error', 'AGiXT Service is not initialized yet.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const initialWorkouts = await agixtService.generateMultipleWorkouts(preferences, userProfile, 3, bodyPart);
      setWorkoutPlan(initialWorkouts);
      await AsyncStorage.setItem('currentWorkoutPlan', JSON.stringify(initialWorkouts));
      setPoints(prevPoints => {
        const newPoints = prevPoints + 10;
        AsyncStorage.setItem('points', newPoints.toString());
        return newPoints;
      });
      checkAchievementsAndUpdateState();
    } catch (err) {
      setError('Failed to generate workout plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, checkAchievementsAndUpdateState, showAlert]);

  const handleWorkoutPreferencesComplete = async (preferences: WorkoutPreferences) => {
    setWorkoutPreferences(preferences);
    setShowWorkoutSelection(false);
    await generateWorkouts(preferences);
  };

  const calculateBMI = useCallback(() => {
    if (!currentWeight || !userProfile.feet || !userProfile.inches) {
      showAlert('Missing Information', 'Please ensure weight, feet, and inches are filled in.');
      return;
    }

    const weightKg = parseFloat(currentWeight) * 0.453592;
    const heightM = (parseInt(userProfile.feet, 10) * 12 + parseInt(userProfile.inches, 10)) * 0.0254; // Use radix for parseInt
    const bmi = weightKg / (heightM * heightM);

    const newBmiEntry = {
      date: new Date().toISOString(),
      bmi: parseFloat(bmi.toFixed(2)),
    };

    setBmiHistory(prevHistory => {
      const newHistory = [...prevHistory, newBmiEntry];
      AsyncStorage.setItem('bmiHistory', JSON.stringify(newHistory));
      return newHistory;
    });

    setCurrentWeight('');
    setBmiModalVisible(false);
    showAlert('BMI Calculated', `Your current BMI is ${newBmiEntry.bmi}`);

    // Check for BMI improvement achievement
    if (bmiHistory.length > 0) {
      const previousBmi = bmiHistory[bmiHistory.length - 1].bmi;
      if (newBmiEntry.bmi < previousBmi && !achievements[4].unlocked) {
        const newAchievements = [...achievements];
        newAchievements[4].unlocked = true;
        setAchievements(newAchievements);
        AsyncStorage.setItem('achievements', JSON.stringify(newAchievements));
        showAlert('Achievement Unlocked', 'You improved your BMI!');
        setPoints(prevPoints => {
          const newPoints = prevPoints + 75;
          AsyncStorage.setItem('points', newPoints.toString());
          return newPoints;
        });
      }
    }
  }, [currentWeight, userProfile, bmiHistory, achievements, showAlert]);

  const createCustomExercise = useCallback(async () => {
    if (!agixtService) return;
    if (!customExerciseName || !customExerciseDescription) {
      showAlert('Missing Information', 'Please provide both name and description for the custom exercise.');
      return;
    }

    try {
      setLoading(true);
      const updatedExercises = await agixtService.addCustomExercise(userProfile, {
        name: customExerciseName,
        description: customExerciseDescription
      });
      setCustomExercises(updatedExercises);
      setCustomExerciseName('');
      setCustomExerciseDescription('');
      setCustomExerciseModalVisible(false);
      showAlert('Success', 'Custom exercise added successfully!');
      setPoints(prevPoints => {
        const newPoints = prevPoints + 15;
        AsyncStorage.setItem('points', newPoints.toString());
        return newPoints;
      });
    } catch (error) {
      console.error('Error adding custom exercise:', error);
      showAlert('Error', 'Failed to add custom exercise. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customExerciseName, customExerciseDescription, agixtService, userProfile, showAlert]);

  const saveSettings = useCallback(async () => {
    if (!apiKey.trim() || !apiUri.trim()) {
      showAlert('Invalid Settings', 'Please enter both API Key and API URI.');
      return;
    }

    try {
      setLoading(true);
      await AsyncStorage.setItem('apiKey', apiKey);
      await AsyncStorage.setItem('apiUri', apiUri);

      // Update demo mode based on the saved API URI
      setIsDemoMode(apiUri === 'demo_api_uri');

      const newService = new AGiXTService(isDemoMode);
      newService.updateSettings(apiUri, apiKey);
      await newService.initializeWorkoutAgent();

      setAgixtService(newService);

      setSettingsModalVisible(false);

      showAlert('Settings Saved', 'Your AGiXT settings have been updated and saved.');

      initializeFeatures();
    } catch (error) {
      console.error('Error saving settings:', error);
      showAlert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, apiUri, initializeFeatures, showAlert]);

  const saveProfile = useCallback(async () => {
    await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('workoutPath', workoutPath);
    setIsFirstLaunch(false);
    setProfileModalVisible(false);
    showAlert('Profile Saved', 'Your profile has been updated successfully.');
  }, [userProfile, workoutPath, showAlert]);

  const handleWorkoutCompletion = useCallback(async (difficulty: 'easy' | 'just right' | 'hard') => {
    if (!workoutPlan.length || !agixtService) return;

    const feedback: WorkoutFeedback = {
      workoutId: workoutPlan[0].conversationName,
      difficulty,
      completedExercises: workoutPlan[0].workoutPlan.weeklyPlan[0].exercises.map(ex => ex.name),
    };

    setWorkoutFeedback(feedback);

    try {
      setLoading(true);
      await agixtService.logWorkoutCompletion(userProfile, workoutPlan[0].workoutPlan, feedback);
      
      // Update user profile
      let updatedProfile = updateStreak(userProfile);
      updatedProfile = addExperiencePoints(updatedProfile, 50);
      updatedProfile = awardCoins(updatedProfile, 10);

      // Check for new achievements
      const newAchievements = checkAchievements(updatedProfile, { totalWorkouts: workoutsCompleted + 1 });
      if (newAchievements.length > 0) {
        updatedProfile = {
          ...updatedProfile,
          unlockedAchievements: [...updatedProfile.unlockedAchievements, ...newAchievements]
        };
        newAchievements.forEach(achievementId => {
          const achievement = achievements.find(a => a.id === achievementId);
          if (achievement) {
            showAlert('Achievement Unlocked', `You've unlocked: ${achievement.name}`);
          }
        });
      }

      setUserProfile(updatedProfile);

      // Instead of slicing, remove only the completed workout
      const updatedWorkoutPlan = workoutPlan.filter((_, index) => index !== 0); 
      setWorkoutPlan(updatedWorkoutPlan);
      await AsyncStorage.setItem('currentWorkoutPlan', JSON.stringify(updatedWorkoutPlan));

      setWorkoutsCompleted(prevCompleted => prevCompleted + 1);

      // Generate more workouts only if needed (e.g., below a threshold)
      if (updatedWorkoutPlan.length < 2) { // Adjust the threshold as needed
        await generateWorkouts(workoutPreferences!, selectedBodyPart); // Pass selectedBodyPart
      }
    } catch (error) {
      console.error('Error logging workout completion:', error);
      showAlert('Error', 'Failed to record workout feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [workoutPlan, agixtService, userProfile, generateWorkouts, workoutPreferences, showAlert, workoutsCompleted, achievements, selectedBodyPart]); 

  const refreshMotivationalQuote = useCallback(async () => {
    if (!agixtService) return;

    try {
      setLoading(true);
      const quote = await agixtService.getMotivationalQuote();
      setMotivationalQuote(quote);
    } catch (error) {
      console.error('Error refreshing motivational quote:', error);
      showAlert('Error', 'Failed to get a new motivational quote. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, showAlert]);

  const getProgressReport = useCallback(async () => {
    if (!agixtService) return;

    try {
      setLoading(true);
      const report = await agixtService.getProgressReport(userProfile, [], []);
      setProgressReport(report);
      showAlert('Progress Report', report.summary);
    } catch (error) {
      console.error('Error getting progress report:', error);
      showAlert('Error', 'Failed to get your progress report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, showAlert]);

  const completeChallenge = useCallback(async (challengeId: number) => {
    const updatedChallenges = challenges.map(challenge =>
      challenge.id === challengeId ? { ...challenge, completed: true } : challenge
    );
    setChallenges(updatedChallenges);
    await AsyncStorage.setItem('challenges', JSON.stringify(updatedChallenges));

    setPoints(prevPoints => {
      const newPoints = prevPoints + 50;
      AsyncStorage.setItem('points', newPoints.toString());
      return newPoints;
    });

    // Check for challenge achievement
    const completedChallenges = updatedChallenges.filter(c => c.completed).length;
    if (completedChallenges >= 5 && !achievements[3].unlocked) {
      const newAchievements = [...achievements];
      newAchievements[3].unlocked = true;
      setAchievements(newAchievements);
      await AsyncStorage.setItem('achievements', JSON.stringify(newAchievements));
      showAlert('Achievement Unlocked', 'You completed 5 challenges!');
      setPoints(prevPoints => {
        const newPoints = prevPoints + 100;
        AsyncStorage.setItem('points', newPoints.toString());
        return newPoints;
      });
    }

    showAlert('Challenge Completed', 'Congratulations! You\'ve completed a challenge.');
  }, [challenges, achievements, showAlert]);

  const createSocialChallenge = useCallback(async (challengeDetails: Partial<SocialChallenge>) => {
    if (!agixtService) return;
    try {
      setLoading(true);
      const newChallenge = await agixtService.createSocialChallenge(userProfile, challengeDetails);
      setSocialChallenges(prev => [...prev, newChallenge]);
      showAlert('Success', 'Social challenge created successfully!');
    } catch (error) {
      console.error('Error creating social challenge:', error);
      showAlert('Error', 'Failed to create social challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, showAlert]);

  const joinSocialChallenge = useCallback(async (challengeId: string) => {
    if (!agixtService) return;
    try {
      setLoading(true);
      const updatedChallenge = await agixtService.joinSocialChallenge(userProfile, challengeId);
      setSocialChallenges(prev => prev.map(c => c.id === challengeId ? updatedChallenge : c));
      showAlert('Success', 'You have joined the social challenge!');
    } catch (error) {
      console.error('Error joining social challenge:', error);
      showAlert('Error', 'Failed to join social challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agixtService, userProfile, showAlert]);

  // Function to filter workout-like activities (updated)
  const filterWorkouts = (records: any[]): any[] => {
    // Implement your filtering logic based on available data
    // For example, filter by duration or other relevant criteria
    const workoutActivities = records.filter(record => {
      // Example: Filter records with duration greater than 5 minutes
      return record.duration > 300000; 
    });
    return workoutActivities;
  };

  // Background task to fetch and process activities (updated)
  const backgroundTask = async () => {
    try {
      if (!healthConnectAvailable || !healthConnectPermissionsGranted) {
        console.warn('Health Connect is not available or permissions are not granted.');
        return BackgroundFetchResult.Restricted;
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

      const options: ReadRecordsOptions = {
        timeRangeFilter: {
          operator: 'between',
          startTime: oneHourAgo.toISOString(),
          endTime: now.toISOString(),
        }
      };

      // Fetch relevant records (e.g., steps, distance, calories)
      const stepsData = await HealthConnect.readRecords(
        HealthConnect.RecordType.STEPS,
        options
      );

      // ... fetch other record types as needed (e.g., DISTANCE, ACTIVE_CALORIES_BURNED)

      // Combine and filter records to identify workout sessions
      const allRecords = [...stepsData.records /*, ...otherRecords*/];
      const workouts = filterWorkouts(allRecords);

      if (workouts.length > 0 && agixtService) {
        try {
          const analysis = await agixtService.analyzeWorkouts(workouts);
          setWorkoutAnalysis(analysis);

          if (analysis.warning) {
            showAlert('Workout Recommendation', analysis.recommendation);
          }
        } catch (error) {
          console.error('Error analyzing workouts:', error);
          // Additional error handling (e.g., display a user-friendly message)
        }
      }

      return BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Error in background task:', error);
      return BackgroundFetchResult.Failed;
    }
  };

  useEffect(() => {
    const initBackgroundFetch = async () => {
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Adjust as needed
        },
        backgroundTask,
      );
      await BackgroundFetch.registerHeadlessTask(backgroundTask); 
    };

    initBackgroundFetch();

    return () => {
      BackgroundFetch.stop(); 
    };
  }, []);

  // Initialize Health Connect and request permissions
  useEffect(() => {
    const initHealthConnect = async () => {
      try {
        const isAvailable = await HealthConnect.initialize();
        setHealthConnectAvailable(isAvailable);

        if (isAvailable) {
          const status = await HealthConnect.getSdkStatus();
          if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
            const grantedPermissions = await HealthConnect.requestPermission([
              {
                accessType: 'read',
                recordType: RecordType.STEPS,
              },
              // ... request permissions for other record types
            ]);
            setHealthConnectPermissionsGranted(grantedPermissions.length > 0);
          } else {
            // Handle cases where the SDK is not available
            Alert.alert(
              'Health Connect Not Available',
              'The Health Connect SDK is not available on this device. Please make sure you have the latest version of Health Connect installed.',
            );
          }
        }
      } catch (error) {
        console.error('Error initializing Health Connect:', error);
        // Handle errors gracefully
      }
    };

    initHealthConnect();
  }, []);

  // Initialize AGiXTService (replace placeholders with your actual values)
  useEffect(() => {
    const initAgixtService = async () => {
      const storedApiKey = await AsyncStorage.getItem('apiKey'); // Get API key from storage
      const storedApiUri = await AsyncStorage.getItem('apiUri'); // Get API URI from storage

      if (storedApiKey && storedApiUri) {
        const service = new AGiXTService(false); // Assuming not in demo mode
        service.updateSettings(storedApiUri, storedApiKey);
        setAgixtService(service);
      }
    };

    initAgixtService();
  }, []);

  // Initialize and manage the background task
  useEffect(() => {
    const initBackgroundFetch = async () => {
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Adjust the interval as needed
        },
        backgroundTask,
      );
      await BackgroundFetch.registerHeadlessTask(backgroundTask);
    };

    initBackgroundFetch();

    return () => {
      BackgroundFetch.stop();
    };
  }, [healthConnectAvailable, healthConnectPermissionsGranted]); 

  // *** Example UI for Displaying Recommendations ***
  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={isFirstLaunch ? "Welcome" : "Main"}>
            <Stack.Screen 
              name="Welcome" 
              component={WelcomeScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="WorkoutSelection" 
              options={{ headerShown: false }}
            >
              {(props) => (
                <WorkoutSelectionScreen 
                  {...props} 
                  onComplete={handleWorkoutPreferencesComplete} 
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Main" options={{ headerShown: false }}>
              {() => (
                <Tab.Navigator
                screenOptions={({ route }) => ({
                  headerShown: false, 
                  tabBarIcon: ({ focused, color, size }) => {
                      let iconName: any;

                      if (route.name === 'Dashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                      } else if (route.name === 'Workout') {
                        iconName = focused ? 'fitness' : 'fitness-outline';
                      } else if (route.name === 'Nutrition') {
                        iconName = focused ? 'nutrition' : 'nutrition-outline';
                      } else if (route.name === 'Progress') {
                        iconName = focused ? 'trending-up' : 'trending-up-outline';
                      } else if (route.name === 'Social') {
                        iconName = focused ? 'people' : 'people-outline';
                      }

                      return <Ionicons name={iconName} size={size} color={color} />;
                    },
                    tabBarActiveTintColor: '#FFD700',
                    tabBarInactiveTintColor: '#fff',
                    tabBarStyle: styles.tabBar,
                    backgroundColor: '#000',
                    tabBarLabelStyle: styles.tabText,
                  })}
                >
    <Tab.Screen name="Dashboard">
      {(props) => (
        <DashboardTab
          {...props} 
          userProfile={userProfile}
          workoutPlan={workoutPlan[0]}
          points={points}
          motivationalQuote={motivationalQuote}
          refreshQuote={refreshMotivationalQuote}
          onEditProfile={handleEditProfile}
          onOpenSettings={handleOpenSettings}
        />
      )}
    </Tab.Screen>

    <Tab.Screen name="Workout">
      {(props) => (
        <WorkoutTab
          {...props}
          workoutPlan={workoutPlan}
          onGenerateWorkout={(bodyPart) => {
            if (workoutPreferences) { // Check if workoutPreferences is not null
              generateWorkouts(workoutPreferences, bodyPart);
            }
          }}
          onCompleteWorkout={handleWorkoutCompletion}
          workoutPreferences={workoutPreferences} 
        />
      )}
    </Tab.Screen>
                  <Tab.Screen name="Nutrition">
                    {(props) => (
                      <NutritionTab
                        {...props}
                        mealPlan={mealPlan}
                        onUpdateMealPlan={loadMealPlan}
                      />
                    )}
                  </Tab.Screen>
                  <Tab.Screen name="Progress">
                    {(props) => (
                      <ProgressTab
                        {...props}
                        bmiHistory={bmiHistory}
                        progressReport={progressReport}
                        onCalculateBMI={() => setBmiModalVisible(true)}
                        onGenerateReport={getProgressReport}
                      />
                    )}
                  </Tab.Screen>
                  <Tab.Screen name="Social">
                    {(props) => (
                      <SocialTab
                        {...props}
                        socialChallenges={socialChallenges}
                        onCreateChallenge={createSocialChallenge}
                        onJoinChallenge={joinSocialChallenge}
                      />
                    )}
                  </Tab.Screen>
                </Tab.Navigator>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>

        <AlertModal
          visible={alertModalVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setAlertModalVisible(false)}
        />
        <LoadingOverlay isVisible={loading} />

        {/* Profile Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={profileModalVisible}
          onRequestClose={() => setProfileModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Edit Profile</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {userProfile.profileImage ? (
                  <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
                ) : (
                  <Text style={styles.imagePickerText}>Upload Profile Picture</Text>
                )}
              </TouchableOpacity>
              <ScrollView style={styles.inputScrollView}>
                <Formik
                  initialValues={userProfile}
                  onSubmit={saveProfile}
                  validationSchema={Yup.object().shape({
                    name: Yup.string().required('Name is required'),
                    age: Yup.number().required('Age is required').positive().integer(),
                    gender: Yup.string().required('Gender is required'),
                    feet: Yup.number().required('Height (feet) is required').positive().integer(),
                    inches: Yup.number().required('Height (inches) is required').min(0).max(11).integer(),
                    weight: Yup.number().required('Weight is required').positive(),
                    goal: Yup.string().required('Fitness goal is required'),
                    fitnessLevel: Yup.string().required('Fitness level is required'),
                    daysPerWeek: Yup.number().required('Days per week is required').min(1).max(7).integer(),
                    bio: Yup.string(),
                    interests: Yup.string()
                  })}
                >
                  {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                    <>
                      {Object.keys(userProfile).map((key) => (
                        <View key={key}>
                          {key !== 'profileImage' && (
                            <TextInput
                              style={styles.input}
                              placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                              value={values[key as keyof UserProfile]?.toString()}
                              onChangeText={handleChange(key)}
                              onBlur={handleBlur(key)}
                              placeholderTextColor="#ccc"
                              keyboardType={key === 'age' || key === 'weight' || key === 'feet' || key === 'inches' || key === 'daysPerWeek' ? 'numeric' : 'default'}
                            />
                          )}
                          {errors[key as keyof UserProfile] && touched[key as keyof UserProfile] && (
                            <Text style={styles.errorText}>{errors[key as keyof UserProfile]}</Text>
                          )}
                        </View>
                      ))}
                      <TextInput
                        style={styles.input}
                        placeholder="Workout Path (e.g., muscle builder, weight loss)"
                        value={workoutPath}
                        onChangeText={setWorkoutPath}
                        placeholderTextColor="#ccc"
                      />
                      <TouchableOpacity style={styles.modalButton} onPress={() => handleSubmit()}>
                        <Text style={styles.modalButtonText}>Save</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </Formik>
              </ScrollView>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setProfileModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BMI Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={bmiModalVisible}
          onRequestClose={() => setBmiModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Calculate BMI</Text>
              <TextInput
                style={styles.input}
                placeholder="Current Weight (lbs)"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
                placeholderTextColor="#ccc"
              />
              <TouchableOpacity style={styles.modalButton} onPress={calculateBMI}>
                <Text style={styles.modalButtonText}>Calculate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setBmiModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={settingsModalVisible}
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>AGiXT Settings</Text>
              <TextInput
                style={styles.input}
                placeholder="API Key"
                value={apiKey}
                onChangeText={setApiKey}
                placeholderTextColor="#ccc"
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="API URI"
                value={apiUri}
                onChangeText={setApiUri}
                placeholderTextColor="#ccc"
              />
              <TouchableOpacity style={styles.modalButton} onPress={saveSettings}>
                <Text style={styles.modalButtonText}>Save Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSettingsModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Feedback Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={feedbackModalVisible}
          onRequestClose={() => setFeedbackModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Workout Feedback</Text>
              <Text style={styles.modalText}>How was your workout?</Text>
              <TouchableOpacity style={styles.feedbackOption} onPress={() => handleWorkoutCompletion('easy')}>
                <Text style={styles.feedbackOptionText}>Easy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.feedbackOption} onPress={() => handleWorkoutCompletion('just right')}>
                <Text style={styles.feedbackOptionText}>Just Right</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.feedbackOption} onPress={() => handleWorkoutCompletion('hard')}>
                <Text style={styles.feedbackOptionText}>Hard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setFeedbackModalVisible
                           (false)}>
                           <Text style={styles.modalButtonText}>Cancel</Text>
                         </TouchableOpacity>
                       </View>
                     </View>
                   </Modal>

                                     {/* Achievements Modal */}
                                     <AchievementsModal
                     visible={achievementsModalVisible}
                     onClose={() => setAchievementsModalVisible(false)}
                     userProfile={userProfile}
                     achievements={achievements}
                   />
           
                   {/* Recommendation UI */}
                   <View style={styles.recommendationContainer}>
                     {workoutAnalysis && (
                       <Text style={styles.recommendationText}>
                         {workoutAnalysis.recommendation}
                       </Text>
                     )}
                   </View>
                   
                 </SafeAreaView>
               </ErrorBoundary>
             );
           };
           
           
           
           // Styles
           const styles = StyleSheet.create({
             container: {
               flex: 1,
               backgroundColor: '#000',
             },
             gradient: {
               // Stretch the gradient to the bottom
               position: 'absolute',
               top: 0,
               left: 0,
               right: 0,
               bottom: 0,
               padding: 20,
               flex: 1,
             },
             header: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               paddingHorizontal: 20,
               paddingTop: 20,
               paddingBottom: 10,
               backgroundColor: '#1a1a1a',
             },
             profileImage: {
               width: 40,
               height: 40,
               borderRadius: 20,
               borderWidth: 2,
               borderColor: '#FFD700',
             },
             headerTitle: {
               fontSize: 24,
               fontWeight: 'bold',
               color: '#FFD700',
             },
             content: {
               flex: 1,
               backgroundColor: '#000',
             },
             tabBar: {
               flexDirection: 'row',
               justifyContent: 'space-around',
               paddingVertical: 10,
               borderTopWidth: 1,
               borderTopColor: '#333',
               backgroundColor: '#1a1a1a',
             },
             tabItem: {
               alignItems: 'center',
             },
             tabText: {
               color: '#FFD700',
               fontSize: 12,
               marginTop: 4,
             },
             activeTabText: {
               color: '#FFA500',
             },
             modalContainer: {
               flex: 1,
               justifyContent: 'center',
               alignItems: 'center',
               backgroundColor: 'rgba(0, 0, 0, 0.9)',
             },
             modalContent: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 20,
               width: '80%',
               maxHeight: '80%',
             },
             modalHeader: {
               fontSize: 24,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 20,
               textAlign: 'center',
             },
             input: {
               backgroundColor: '#333',
               borderRadius: 5,
               padding: 10,
               marginBottom: 10,
               color: '#fff',
             },
             modalButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 20,
             },
             modalButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             cancelButton: {
               backgroundColor: '#FF6347',
               marginTop: 10,
             },
             imagePicker: {
               backgroundColor: '#333',
               borderRadius: 10,
               padding: 20,
               alignItems: 'center',
               marginBottom: 20,
             },
             imagePickerText: {
               color: '#FFD700',
               fontSize: 16,
             },
             inputScrollView: {
               maxHeight: 300,
             },
             errorText: {
               color: '#FF6347',
               fontSize: 12,
               marginBottom: 5,
             },
             workoutCard: {
               backgroundColor: '#1a1a1a',
               borderRadius: 15,
               padding: 20,
               marginBottom: 20,
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.3,
               shadowRadius: 5,
               elevation: 5,
             },
             startButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 10,
               alignItems: 'center',
               marginTop: 15,
               shadowColor: '#FFA500',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.5,
               shadowRadius: 3,
               elevation: 3,
             },
             quoteCard: {
               backgroundColor: '#1a1a1a',
               borderRadius: 15,
               padding: 20,
               marginBottom: 20,
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.3,
               shadowRadius: 5,
               elevation: 5,
             },
             optionButton: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               backgroundColor: '#333',
               padding: 15,
               borderRadius: 10,
               marginBottom: 10,
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.2,
               shadowRadius: 3,
               elevation: 3,
             },
             selectedOption: {
               backgroundColor: '#4a4a4a',
             },
             generateWorkoutButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 10,
               alignItems: 'center',
               marginTop: 20,
               shadowColor: '#FFA500',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.5,
               shadowRadius: 3,
               elevation: 3,
             },
             completeWorkoutButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 20,
             },
             generateMealPlanButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
             },
             calculateBMIButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginBottom: 20,
             },
             generateReportButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginBottom: 20,
             },
             refreshChallengesButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 20,
             },
             feedbackOption: {
               backgroundColor: '#333',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginBottom: 10,
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.2,
               shadowRadius: 3,
               elevation: 3,
             },
             levelProgressContainer: {
               marginTop: 10,
               alignItems: 'center',
             },
             levelText: {
               color: '#FFD700',
               fontSize: 18,
               fontWeight: 'bold',
             },
             progressBar: {
               width: '100%',
               height: 10,
               backgroundColor: '#333',
               borderRadius: 5,
               marginTop: 5,
               overflow: 'hidden',
             },
             progressFill: {
               height: '100%',
               backgroundColor: '#FFD700',
             },
             xpText: {
               color: '#fff',
               fontSize: 14,
               marginTop: 5,
             },
             achievementItem: {
               flexDirection: 'row',
               alignItems: 'center',
               backgroundColor: '#333',
               padding: 10,
               borderRadius: 5,
               marginBottom: 10,
             },
             achievementIcon: {
               width: 40,
               height: 40,
               marginRight: 10,
             },
             achievementInfo: {
               flex: 1,
             },
             achievementName: {
               color: '#FFD700',
               fontSize: 16,
               fontWeight: 'bold',
             },
             achievementDescription: {
               color: '#fff',
               fontSize: 14,
             },
             closeButton: {
               backgroundColor: '#FFD700',
               padding: 10,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 20,
             },
             closeButtonText: {
               color: '#000',
               fontSize: 16,
               fontWeight: 'bold',
             },
             dashboardContainer: {
               flex: 1,
               backgroundColor: '#000',
             },
             topSection: {
               alignItems: 'center',
               marginBottom: 30,
             },
             userName: {
               fontSize: 28,
               fontWeight: 'bold',
               color: '#FFD700',
               marginTop: 10,
             },
             points: {
               fontSize: 18,
               color: '#FFD700',
               marginTop: 5,
             },
             cardTitle: {
               fontSize: 20,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 10,
             },
             workoutName: {
               fontSize: 18,
               color: '#fff',
               marginBottom: 15,
             },
             startButtonText: {
               color: '#000',
               fontSize: 16,
               fontWeight: 'bold',
             },
             quoteText: {
               color: '#FFD700',
               fontSize: 16,
               fontStyle: 'italic',
               textAlign: 'center',
               marginBottom: 10,
             },
             refreshButton: {
               padding: 10,
               alignSelf: 'center',
             },
             animation: {
               width: 25, // or 40 for an even smaller animation
               height: 25, // or 40 for an even smaller animation
               alignSelf: 'center',
             },
             tabContent: {
               flex: 1,
               padding: 20,
               backgroundColor: '#000',
             },
             tabTitle: {
               fontSize: 24,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 20,
             },
             workoutTabContent: {
               flexGrow: 1,
               padding: 20,
               backgroundColor: '#000',
             },
             exerciseItem: {
               marginBottom: 10,
             },
             exerciseName: {
               color: '#FFD700',
               fontSize: 18,
               fontWeight: 'bold',
               marginBottom: 5,
             },
             exerciseDetail: {
               color: '#fff',
               fontSize: 14,
             },
             completeWorkoutButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             generateWorkoutButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             mealPlanContainer: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 15,
               marginBottom: 20,
             },
             mealTitle: {
               color: '#FFD700',
               fontSize: 18,
               fontWeight: 'bold',
               marginBottom: 5,
             },
             mealContent: {
               color: '#fff',
               marginBottom: 10,
             },
             updateMealPlanButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 20,
             },
             updateMealPlanButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             generateMealPlanButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             bmiChartContainer: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 15,
               marginBottom: 20,
             },
             chart: {
               marginVertical: 8,
               borderRadius: 16,
             },
             calculateBMIButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             generateReportButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             progressReportContainer: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 15,
               marginBottom: 20,
             },
             progressReportContent: {
               color: '#fff',
             },
             challengeItem: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 15,
               marginBottom: 15,
             },
             challengeName: {
               fontSize: 18,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 5,
             },
             challengeDescription: {
               color: '#fff',
               marginBottom: 10,
             },
             challengeDuration: {
               color: '#ccc',
             },
             challengeDifficulty: {
               color: '#ccc',
               marginBottom: 10,
             },
             challengeButton: {
               backgroundColor: '#FFD700',
               padding: 10,
               borderRadius: 5,
               alignItems: 'center',
             },
             challengeCompleted: {
               backgroundColor: '#4CAF50',
             },
             challengeButtonText: {
               color: '#000',
               fontWeight: 'bold',
             },
             refreshChallengesButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             loadingOverlay: {
               ...StyleSheet.absoluteFillObject,
               backgroundColor: 'rgba(0, 0, 0, 0.7)',
               justifyContent: 'center',
               alignItems: 'center',
             },
             alertModalContainer: {
               flex: 1,
               justifyContent: 'center',
               alignItems: 'center',
               backgroundColor: 'rgba(0, 0, 0, 0.5)',
             },
             alertModalContent: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 20,
               alignItems: 'center',
               width: '80%',
             },
             alertModalTitle: {
               fontSize: 20,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 10,
             },
             alertModalMessage: {
               color: '#fff',
               textAlign: 'center',
               marginBottom: 20,
             },
             alertModalButton: {
               backgroundColor: '#FFD700',
               padding: 10,
               borderRadius: 5,
               width: '100%',
               alignItems: 'center',
             },
             alertModalButtonText: {
               color: '#000',
               fontWeight: 'bold',
             },
             errorContainer: {
               flex: 1,
               justifyContent: 'center',
               alignItems: 'center',
               backgroundColor: '#000',
             },
             modalText: {
               color: '#fff',
               fontSize: 16,
               marginBottom: 15,
             },
             feedbackOptionText: {
               color: '#FFD700',
               fontSize: 16,
             },
             workoutList: {
               maxHeight: 200,
               marginTop: 20,
             },
             sectionTitle: {
               fontSize: 20,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 15,
             },
             progressReportSubtitle: {
               fontSize: 18,
               fontWeight: 'bold',
               color: '#FFD700',
               marginTop: 10,
               marginBottom: 5,
             },
             challengeDates: {
               color: '#ccc',
               marginBottom: 10,
             },
             joinButton: {
               backgroundColor: '#FFD700',
               padding: 10,
               borderRadius: 5,
               alignItems: 'center',
             },
             joinButtonText: {
               color: '#000',
               fontWeight: 'bold',
             },
             createChallengeButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 20,
             },
             createChallengeButtonText: {
               color: '#000',
               fontWeight: 'bold',
               fontSize: 16,
             },
             welcomeContainer: {
               flex: 1,
               justifyContent: 'center',
               alignItems: 'center',
               backgroundColor: '#000',
             },
             welcomeTitle: {
               fontSize: 36,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 30,
               textAlign: 'center',
             },
             welcomeAnimation: {
               width: 200,
               height: 200,
             },
             getStartedButton: {
               backgroundColor: '#FFD700',
               padding: 15,
               borderRadius: 10,
               alignItems: 'center',
               marginTop: 40,
               shadowColor: '#FFA500',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.5,
               shadowRadius: 3,
               elevation: 3,
             },
             getStartedButtonText: {
               color: '#000',
               fontSize: 18,
               fontWeight: 'bold',
             },
             questionContainer: {
               flex: 1,
               justifyContent: 'center',
               alignItems: 'center',
               paddingHorizontal: 20,
             },
             questionText: {
               fontSize: 24,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 20,
               textAlign: 'center',
             },
             optionText: {
               fontSize: 18,
               color: '#fff',
             },
             workoutListHeader: {
               fontSize: 20,
               fontWeight: 'bold',
               color: '#FFD700',
               marginTop: 20,
               marginBottom: 10,
             },
             workoutItem: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               backgroundColor: '#333',
               padding: 15,
               borderRadius: 10,
               marginBottom: 10,
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.2,
               shadowRadius: 3,
               elevation: 3,
             },
             incompatibleWorkout: {
               opacity: 0.5,
             },
             streakContainer: {
               flexDirection: 'row',
               alignItems: 'center',
               marginTop: 10,
             },
             streakText: {
               color: '#FFD700',
               fontSize: 16,
               marginLeft: 5,
             },
             coinsContainer: {
               flexDirection: 'row',
               alignItems: 'center',
               marginTop: 10,
             },
             coinsText: {
               color: '#FFD700',
               fontSize: 16,
               marginLeft: 5,
             },
             achievementsButton: {
               backgroundColor: '#4CAF50',
               padding: 10,
               borderRadius: 5,
               alignItems: 'center',
               marginTop: 10,
             },
             achievementsButtonText: {
               color: '#fff',
               fontWeight: 'bold',
             },
             socialChallengeItem: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 15,
               marginBottom: 15,
             },
             socialChallengeName: {
               fontSize: 18,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 5,
             },
             socialChallengeDescription: {
               color: '#fff',
               marginBottom: 10,
             },
             socialChallengeDates: {
               color: '#ccc',
               marginBottom: 10,
             },
             leaderboardContainer: {
               backgroundColor: '#1a1a1a',
               borderRadius: 10,
               padding: 15,
               marginTop: 20,
             },
             leaderboardTitle: {
               fontSize: 20,
               fontWeight: 'bold',
               color: '#FFD700',
               marginBottom: 10,
             },
             leaderboardItem: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               paddingVertical: 5,
             },
             leaderboardRank: {
               color: '#fff',
               fontSize: 16,
               fontWeight: 'bold',
               width: 30,
             },
             leaderboardName: {
               color: '#fff',
               fontSize: 16,
               flex: 1,
             },
             leaderboardScore: {
               color: '#FFD700',
               fontSize: 16,
               fontWeight: 'bold',
             },
             dashboardHeader: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               marginBottom: 20,
             },
             settingsButton: {
               padding: 10,
             },
             bodyPartOption: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               backgroundColor: '#333',
               padding: 15,
               borderRadius: 10,
               marginBottom: 10,
               shadowColor: '#000',
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.2,
               shadowRadius: 3,
               elevation: 3,
             },
             bodyPartOptionText: {
               fontSize: 18,
               color: '#fff',
             },
             // Styles for the recommendation UI
             recommendationContainer: {
               padding: 20,
               backgroundColor: '#1a1a1a', // Or your preferred background color
               borderRadius: 10,
               marginBottom: 20,
             },
             recommendationText: {
               color: '#FFD700', // Or your preferred text color
               fontSize: 16,
             },
           });
           
           export default WorkoutApp;