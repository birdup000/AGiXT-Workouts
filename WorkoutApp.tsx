import React, { useState, useEffect, useCallback } from 'react';
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
  UserProfile,
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
  WorkoutPreferences
} from './AGiXTService';

const { width, height } = Dimensions.get('window');
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [typedText, setTypedText] = useState('');
  const fadeAnim = new Animated.Value(0);

  const fullText = "Welcome to AGiXT Workouts";

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setTypedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(onComplete, 1000);
        });
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <View style={styles.welcomeContainer}>
      <Text style={styles.typedText}>{typedText}</Text>
      <Animated.Text style={[styles.fadeText, { opacity: fadeAnim }]}>
        Your journey to fitness begins here
      </Animated.Text>
    </View>
  );
};

const sampleWorkouts = [
  { name: "Full Body Strength", equipment: ["Dumbbells", "Barbell", "Bench"] },
  { name: "Bodyweight HIIT", equipment: ["Bodyweight Only"] },
  { name: "Resistance Band Total Body", equipment: ["Resistance Bands"] },
  { name: "Kettlebell Circuit", equipment: ["Kettlebells"] },
  { name: "Dumbbell Upper Body", equipment: ["Dumbbells"] },
  { name: "Outdoor Running Intervals", equipment: ["Bodyweight Only"] },
  { name: "Pull-up Bar Workout", equipment: ["Pull-up Bar"] },
  { name: "Gym Machine Circuit", equipment: ["Gym Machines"] },
];

const WorkoutSelectionScreen: React.FC<{ onComplete: (preferences: WorkoutPreferences) => void }> = ({ onComplete }) => {
  const [preferences, setPreferences] = useState<WorkoutPreferences>({
    location: '',
    space: '',
    equipment: [],
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [filteredWorkouts, setFilteredWorkouts] = useState(sampleWorkouts);

  const questions = [
    {
      text: "Where will you be working out?",
      options: ["Home", "Gym", "Outdoors"],
      key: "location",
    },
    {
      text: "How much space do you have?",
      options: ["Small", "Medium", "Large"],
      key: "space",
    },
    {
      text: "What equipment do you have access to?",
      options: ["Dumbbells", "Barbell", "Resistance Bands", "Bodyweight Only", "Kettlebells", "Pull-up Bar", "Bench"],
      key: "equipment",
      multiple: true,
    },
  ];

  const handleSelection = (option: string) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPreferences(prev => {
        let newPreferences;
        if (questions[currentQuestion].multiple) {
          const equipmentList = prev.equipment.includes(option)
            ? prev.equipment.filter(item => item !== option)
            : [...prev.equipment, option];
          newPreferences = { ...prev, equipment: equipmentList };
        } else {
          newPreferences = { ...prev, [questions[currentQuestion].key]: option };
        }
        
        // Update filtered workouts
        const updatedWorkouts = sampleWorkouts.filter(workout => {
          if (newPreferences.location === 'Gym' && workout.name.includes('Outdoor')) return false;
          if (newPreferences.location === 'Outdoors' && !workout.name.includes('Outdoor')) return false;
          return workout.equipment.some(eq => newPreferences.equipment.includes(eq));
        });
        setFilteredWorkouts(updatedWorkouts);
        
        return newPreferences;
      });

      if (!questions[currentQuestion].multiple) {
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(prev => prev + 1);
        }
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const renderWorkoutItem = (workout: typeof sampleWorkouts[0]) => {
    const isCompatible = workout.equipment.some(eq => preferences.equipment.includes(eq));
    const isOutdoor = workout.name.includes('Outdoor');
    const isLocationCompatible = 
      (preferences.location === 'Outdoors' && isOutdoor) ||
      (preferences.location !== 'Outdoors' && !isOutdoor);

    return (
      <View key={workout.name} style={[
        styles.workoutItem,
        !isCompatible && styles.incompatibleWorkout,
        !isLocationCompatible && styles.incompatibleWorkout
      ]}>
        <Text style={styles.workoutName}>{workout.name}</Text>
        {(!isCompatible || !isLocationCompatible) && (
          <Ionicons name="warning-outline" size={24} color="#FFA500" />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <Text style={styles.questionText}>{questions[currentQuestion].text}</Text>
        {questions[currentQuestion].options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              questions[currentQuestion].multiple &&
                preferences.equipment.includes(option) &&
                styles.selectedOption,
            ]}
            onPress={() => handleSelection(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
            {questions[currentQuestion].multiple && (
              <Ionicons
                name={
                  preferences.equipment.includes(option)
                    ? "checkbox"
                    : "square-outline"
                }
                size={24}
                color="#FFD700"
              />
            )}
          </TouchableOpacity>
        ))}
        <Text style={styles.workoutListHeader}>Available Workouts:</Text>
        <ScrollView style={styles.workoutList}>
          {filteredWorkouts.map(renderWorkoutItem)}
        </ScrollView>
        {currentQuestion === questions.length - 1 && (
          <TouchableOpacity style={styles.nextButton} onPress={() => onComplete(preferences)}>
            <Text style={styles.nextButtonText}>Generate Workouts</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

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

interface LoadingOverlayProps {
  isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );
};

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

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

interface DashboardTabProps {
  userProfile: UserProfile;
  workoutPlan: WorkoutPlanResponse | null;
  points: number;
  motivationalQuote: string;
  refreshQuote: () => Promise<void>;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ userProfile, workoutPlan, points, motivationalQuote, refreshQuote }) => {
  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back, {userProfile.name}!</Text>
        <Text style={styles.pointsText}>{points} Fitness Points</Text>
      </View>
      {workoutPlan && (
        <View style={styles.workoutCard}>
          <Text style={styles.cardTitle}>Today's Workout</Text>
          <Text style={styles.workoutInfo}>{workoutPlan.workoutPlan.weeklyPlan[0].day}</Text>
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.quoteCard}>
        <Text style={styles.quoteText}>{motivationalQuote}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshQuote}>
          <Ionicons name="refresh-outline" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

interface WorkoutTabProps {
  workoutPlan: WorkoutPlanResponse[];
  onGenerateWorkout: () => void;
  onCompleteWorkout: (difficulty: 'easy' | 'just right' | 'hard') => Promise<void>;
}

const WorkoutTab: React.FC<WorkoutTabProps> = ({ workoutPlan, onGenerateWorkout, onCompleteWorkout }) => {
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

  return (
    <FlatList
      data={workoutPlan}
      renderItem={renderWorkoutItem}
      keyExtractor={(item, index) => `${item.conversationName}-${index}`}
      ListHeaderComponent={<Text style={styles.tabTitle}>Workouts</Text>}
      ListEmptyComponent={
        <TouchableOpacity style={styles.generateWorkoutButton} onPress={onGenerateWorkout}>
          <Text style={styles.generateWorkoutButtonText}>Generate Workout Plans</Text>
        </TouchableOpacity>
      }
    />
  );
};

interface NutritionTabProps {
  mealPlan: MealPlan | null;
  onUpdateMealPlan: () => Promise<void>;
}

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
          {mealPlan.snacks.map((snack, index) => (
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

interface ProgressTabProps {
  bmiHistory: {date: string, bmi: number}[];
  progressReport: string;
  onCalculateBMI: () => void;
  onGenerateReport: () => Promise<void>;
}

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
              labels: bmiHistory.map(entry => new Date(entry.date).toLocaleDateString()),
              datasets: [{ data: bmiHistory.map(entry => entry.bmi) }]
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
          <Text style={styles.progressReportContent}>{progressReport}</Text>
        </View>
      )}
    </ScrollView>
  );
};

interface ChallengesTabProps {
  challenges: Challenge[];
  onCompleteChallenge: (challengeId: number) => Promise<void>;
  onRefreshChallenges: () => Promise<void>;
}

const ChallengesTab: React.FC<ChallengesTabProps> = ({ challenges, onCompleteChallenge, onRefreshChallenges }) => {
  return (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.tabTitle}>Challenges</Text>
      {challenges.map((challenge) => (
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
    interests: ''
  });
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [points, setPoints] = useState(0);
  const [achievements, setAchievements] = useState([
    { id: 1, name: 'First Workout', description: 'Complete your first workout', unlocked: false },
    { id: 2, name: 'Week Warrior', description: 'Complete all workouts for a week', unlocked: false },
    { id: 3, name: 'Nutrition Master', description: 'Follow meal plan for a month', unlocked: false },
    { id: 4, name: 'Challenge Champion', description: 'Complete 5 challenges', unlocked: false },
    { id: 5, name: 'BMI Improver', description: 'Improve your BMI by 1 point', unlocked: false },
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
  const [progressReport, setProgressReport] = useState('');
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

  const showAlert = useCallback((title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertModalVisible(true);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        // Preconfigure AGiXT settings
        const defaultApiKey = 'your_default_api_key';
        const defaultApiUri = 'your_default_api_uri';
        await AsyncStorage.setItem('apiKey', defaultApiKey);
        await AsyncStorage.setItem('apiUri', defaultApiUri);
        
        const service = new AGiXTService();
        service.updateSettings(defaultApiUri, defaultApiKey);
        await service.initializeWorkoutAgent();
        setAgixtService(service);

        const storedProfile = await AsyncStorage.getItem('userProfile');
        const storedWorkoutPath = await AsyncStorage.getItem('workoutPath');
        const storedWorkoutPlan = await AsyncStorage.getItem('currentWorkoutPlan');
        const storedPoints = await AsyncStorage.getItem('points');
        const storedWorkoutsCompleted = await AsyncStorage.getItem('workoutsCompleted');
        
        if (storedProfile && storedWorkoutPath) {
          setUserProfile(JSON.parse(storedProfile));
          setWorkoutPath(storedWorkoutPath);
          setIsFirstLaunch(false);
          if (storedWorkoutPlan) {
            setWorkoutPlan(JSON.parse(storedWorkoutPlan));
          }
        } else {
          setIsFirstLaunch(true);
        }

        if (storedPoints) setPoints(parseInt(storedPoints));
        if (storedWorkoutsCompleted) setWorkoutsCompleted(parseInt(storedWorkoutsCompleted));
        
        await initializeFeatures();
      } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('Error', 'Failed to initialize the app. Please restart.');
      } finally {
        setLoading(false);
      }
    };
  
    initializeApp();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const loadMealPlan = useCallback(async () => {
    if (!agixtService) return;
    try {
      setLoading(true);
      const storedMealPlan = await AsyncStorage.getItem('mealPlan');
      if (storedMealPlan) {
        setMealPlan(JSON.parse(storedMealPlan));
      } else {
        const newMealPlan = await agixtService.getMealPlan(userProfile);
        setMealPlan(newMealPlan);
        await AsyncStorage.setItem('mealPlan', JSON.stringify(newMealPlan));
      }
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

        const report = await agixtService.getProgressReport(userProfile);
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

  const checkAchievements = useCallback(() => {
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

  const generateWorkouts = useCallback(async (preferences: WorkoutPreferences) => {
    if (!agixtService) {
      showAlert('Error', 'AGiXT Service is not initialized yet.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const initialWorkouts = await agixtService.generateMultipleWorkouts(preferences, 3);
      setWorkoutPlan(initialWorkouts);
      await AsyncStorage.setItem('currentWorkoutPlan', JSON.stringify(initialWorkouts));
      setPoints(prevPoints => {
        const newPoints = prevPoints + 10;
        AsyncStorage.setItem('points', newPoints.toString());
        return newPoints;
      });
      checkAchievements();
    } catch (err) {
      setError('Failed to generate workout plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [agixtService, checkAchievements, showAlert]);

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
    const heightM = (parseInt(userProfile.feet) * 12 + parseInt(userProfile.inches)) * 0.0254;
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
      
      const newService = new AGiXTService();
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
      setWorkoutPlan(prevPlan => prevPlan.slice(1));
      await AsyncStorage.setItem('currentWorkoutPlan', JSON.stringify(workoutPlan.slice(1)));
      setFeedbackModalVisible(false);
      setWorkoutsCompleted(prevCompleted => {
        const newCompleted = prevCompleted + 1;
        AsyncStorage.setItem('workoutsCompleted', newCompleted.toString());
        return newCompleted;
      });
      checkAchievements();
      setPoints(prevPoints => {
        const newPoints = prevPoints + 25;
        AsyncStorage.setItem('points', newPoints.toString());
        return newPoints;
      });
      if (workoutPlan.length <= 1) {
        await generateWorkouts(workoutPreferences!);
      }
    } catch (error) {
      console.error('Error logging workout completion:', error);
      showAlert('Error', 'Failed to record workout feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [workoutPlan, agixtService, userProfile, checkAchievements, generateWorkouts, workoutPreferences, showAlert]);

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
      const report = await agixtService.getProgressReport(userProfile);
      setProgressReport(report);
      showAlert('Progress Report', report);
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

  const renderMainContent = useCallback(() => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab userProfile={userProfile} workoutPlan={workoutPlan[0]} points={points} motivationalQuote={motivationalQuote} refreshQuote={refreshMotivationalQuote} />;
      case 'workout':
        return <WorkoutTab workoutPlan={workoutPlan} onGenerateWorkout={() => generateWorkouts(workoutPreferences!)} onCompleteWorkout={handleWorkoutCompletion} />;
      case 'nutrition':
        return <NutritionTab mealPlan={mealPlan} onUpdateMealPlan={loadMealPlan} />;
      case 'progress':
        return <ProgressTab bmiHistory={bmiHistory} progressReport={progressReport} onCalculateBMI={() => setBmiModalVisible(true)} onGenerateReport={getProgressReport} />;
      case 'challenges':
        return <ChallengesTab challenges={challenges} onCompleteChallenge={completeChallenge} onRefreshChallenges={loadChallenges} />;
      default:
        return <DashboardTab userProfile={userProfile} workoutPlan={workoutPlan[0]} points={points} motivationalQuote={motivationalQuote} refreshQuote={refreshMotivationalQuote} />;
    }
  }, [activeTab, userProfile, workoutPlan, points, motivationalQuote, refreshMotivationalQuote, handleWorkoutCompletion, mealPlan, loadMealPlan, bmiHistory, progressReport, getProgressReport, challenges, completeChallenge, loadChallenges, generateWorkouts, workoutPreferences]);

  if (showWelcome) {
    return <WelcomeScreen onComplete={() => {
      setShowWelcome(false);
      setShowWorkoutSelection(true);
    }} />;
  }

  if (showWorkoutSelection) {
    return <WorkoutSelectionScreen onComplete={handleWorkoutPreferencesComplete} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1a1a1a', '#2a2a2a']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
              <Image
                source={{ uri: profileImage || 'https://via.placeholder.com/100' }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AGiXT Workouts</Text>
            <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
              <Ionicons name="settings-outline" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {renderMainContent()}
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('dashboard')}>
              <Ionicons name="home-outline" size={24} color={activeTab === 'dashboard' ? '#FFD700' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('workout')}>
              <Ionicons name="fitness-outline" size={24} color={activeTab === 'workout' ? '#FFD700' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'workout' && styles.activeTabText]}>Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('nutrition')}>
              <Ionicons name="nutrition-outline" size={24} color={activeTab === 'nutrition' ? '#FFD700' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'nutrition' && styles.activeTabText]}>Nutrition</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('progress')}>
              <Ionicons name="trending-up-outline" size={24} color={activeTab === 'progress' ? '#FFD700' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('challenges')}>
              <Ionicons name="trophy-outline" size={24} color={activeTab === 'challenges' ? '#FFD700' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>Challenges</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

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
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
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
                          <TextInput
                            style={styles.input}
                            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                            value={values[key as keyof UserProfile]}
                            onChangeText={handleChange(key)}
                            onBlur={handleBlur(key)}
                            placeholderTextColor="#ccc"
                            keyboardType={key === 'age' || key === 'weight' || key === 'feet' || key === 'inches' || key === 'daysPerWeek' ? 'numeric' : 'default'}
                          />
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
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setFeedbackModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
  },
  fadeText: {
    fontSize: 18,
    color: '#FFD700',
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
  workoutList: {
    maxHeight: 200,
    marginTop: 20,
  },
  workoutListHeader: {
    fontSize: 18,
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
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  workoutName: {
    color: '#fff',
    fontSize: 16,
  },
  incompatibleWorkout: {
    opacity: 0.5,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 15,
  },
  cardContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  cardContent: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  listItemText: {
    color: '#fff',
    fontSize: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  achievementText: {
    color: '#fff',
    fontSize: 16,
  },
  workoutCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
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
  quoteCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
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
  },
  bmiChartContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  feedbackOption: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackOptionText: {
    color: '#FFD700',
    fontSize: 16,
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
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 10,
  },
  pointsText: {
    fontSize: 18,
    color: '#FFD700',
    marginTop: 5,
  },
  workoutInfo: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
  },
  completeWorkoutButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  completeWorkoutButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  generateWorkoutButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  generateWorkoutButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
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
  generateMealPlanButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  generateMealPlanButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  calculateBMIButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  calculateBMIButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  generateReportButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
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
  refreshChallengesButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  refreshChallengesButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionContainer: {
    width: '80%',
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#4a4a4a',
  },
  optionText: {
    fontSize: 18,
    color: '#fff',
  },
  nextButton: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WorkoutApp;