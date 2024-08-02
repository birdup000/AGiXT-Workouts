import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { LineChart } from 'react-native-chart-kit';
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
  FitnessForecast
} from './AGiXTService';

const { width, height } = Dimensions.get('window');
const isLargeScreen = width > 768;

interface LeaderboardEntry {
  id: number;
  name: string;
  points: number;
}

interface Equipment {
  id: number;
  name: string;
  weight?: number;
  resistance?: string;
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ visible, title, message, onClose }) => (
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
);

const WorkoutApp = () => {
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
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanResponse | null>(null);
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [connectedEquipment, setConnectedEquipment] = useState<Equipment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [soreness, setSoreness] = useState<Record<string, string>>({});
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
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(isLargeScreen);
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertModalVisible(true);
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedApiKey = await AsyncStorage.getItem('apiKey');
        const storedApiUri = await AsyncStorage.getItem('apiUri');
        const storedProfile = await AsyncStorage.getItem('userProfile');
        const storedWorkoutPath = await AsyncStorage.getItem('workoutPath');
        const storedWorkoutPlan = await AsyncStorage.getItem('currentWorkoutPlan');
        const storedPoints = await AsyncStorage.getItem('points');
        const storedWorkoutsCompleted = await AsyncStorage.getItem('workoutsCompleted');
        
        if (storedApiKey && storedApiUri) {
          setApiKey(storedApiKey);
          setApiUri(storedApiUri);
          const service = new AGiXTService();
          service.updateSettings(storedApiUri, storedApiKey);
          await service.initializeWorkoutAgent();
          setAgixtService(service);
          
          if (storedProfile && storedWorkoutPath) {
            setUserProfile(JSON.parse(storedProfile));
            setWorkoutPath(storedWorkoutPath);
            setIsFirstLaunch(false);
            if (storedWorkoutPlan) {
              setWorkoutPlan(JSON.parse(storedWorkoutPlan));
            } else {
              await generateWorkoutPlan();
            }
          } else {
            setIsFirstLaunch(true);
          }

          if (storedPoints) setPoints(parseInt(storedPoints));
          if (storedWorkoutsCompleted) setWorkoutsCompleted(parseInt(storedWorkoutsCompleted));
          
          await initializeFeatures();
        } else {
          setIsFirstLaunch(true);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        showAlert('Error', 'Failed to initialize the app. Please restart.');
      }
    };
  
    initializeApp();
  }, []);

  const loadMealPlan = async () => {
    try {
      const storedMealPlan = await AsyncStorage.getItem('mealPlan');
      if (storedMealPlan) {
        setMealPlan(JSON.parse(storedMealPlan));
      } else {
        const newMealPlan = await agixtService!.getMealPlan(userProfile);
        setMealPlan(newMealPlan);
        await AsyncStorage.setItem('mealPlan', JSON.stringify(newMealPlan));
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
      showAlert('Error', 'Failed to load meal plan. Please try again.');
    }
  };

  const loadChallenges = async () => {
    try {
      const storedChallenges = await AsyncStorage.getItem('challenges');
      if (storedChallenges) {
        setChallenges(JSON.parse(storedChallenges));
      } else {
        const newChallenges = await agixtService!.getChallenges(userProfile);
        setChallenges(newChallenges);
        await AsyncStorage.setItem('challenges', JSON.stringify(newChallenges));
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      showAlert('Error', 'Failed to load challenges. Please try again.');
    }
  };

  const initializeFeatures = async () => {
    if (!agixtService) {
      console.error('AGiXT Service is not initialized');
      return;
    }
  
    try {
      if (userProfile.name && userProfile.age && userProfile.gender) {
        await loadChallenges();
        await loadMealPlan();

        const quote = await agixtService.getMotivationalQuote();
        setMotivationalQuote(quote);

        const report = await agixtService.getProgressReport(userProfile);
        setProgressReport(report);
      }
  
      initializeGamification();
      initializeSmartEquipment();
      initializeVoiceControl();
      initializeRecoveryAssistant();
    } catch (error) {
      console.error('Error initializing features:', error);
      setError('Failed to initialize some features. Please try again.');
    }
  };

  const initializeGamification = () => {
    setLeaderboard([
      { id: 1, name: 'John Doe', points: 1000 },
      { id: 2, name: 'Jane Smith', points: 950 },
      { id: 3, name: 'Bob Johnson', points: 900 },
      { id: 4, name: 'Alice Williams', points: 850 },
      { id: 5, name: 'Charlie Brown', points: 800 },
    ]);
  };

  const initializeSmartEquipment = () => {
    setConnectedEquipment([
      { id: 1, name: 'Smart Dumbbell', weight: 20 },
      { id: 2, name: 'Smart Resistance Band', resistance: 'Medium' },
      { id: 3, name: 'Smart Yoga Mat' }, // Remove the duplicate 'name' property
      { id: 4, name: 'Smart Kettlebell', weight: 15 },
    ]);
  };

  const initializeVoiceControl = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission required', 'Microphone access is needed for voice control.');
    }
  };

  const initializeRecoveryAssistant = () => {
    setSoreness({
      legs: 'low',
      arms: 'medium',
      back: 'high',
      chest: 'low',
      shoulders: 'medium',
    });
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setUserProfile({ ...userProfile, [field]: value });
  };

  const generateWorkoutPlan = async () => {
    if (!agixtService) {
      showAlert('Error', 'AGiXT Service is not initialized yet.');
      return;
    }

    if (workoutPlan && !workoutPlan.completed) {
      showAlert('Workout in Progress', 'Please complete your current workout before generating a new one.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await agixtService.createWorkoutPlan(userProfile, workoutPath);
      if (response && response.workoutPlan) {
        setWorkoutPlan(response);
        await AsyncStorage.setItem('currentWorkoutPlan', JSON.stringify(response));
        setPoints(points + 10);
        await AsyncStorage.setItem('points', (points + 10).toString());
        checkAchievements();
      } else {
        setError('Invalid workout plan received');
      }
    } catch (err) {
      setError('Failed to generate workout plan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = () => {
    const newAchievements = [...achievements];
    if (!newAchievements[0].unlocked) {
      newAchievements[0].unlocked = true;
      showAlert('Achievement Unlocked', 'You completed your first workout!');
      setPoints(points + 50);
    }
    if (workoutsCompleted >= 7 && !newAchievements[1].unlocked) {
      newAchievements[1].unlocked = true;
      showAlert('Achievement Unlocked', 'You completed all workouts for a week!');
      setPoints(points + 100);
    }
    // Add more achievement checks here
    setAchievements(newAchievements);
    AsyncStorage.setItem('achievements', JSON.stringify(newAchievements));
    AsyncStorage.setItem('points', points.toString());
  };

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

  const calculateBMI = () => {
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

    const newBmiHistory = [...bmiHistory, newBmiEntry];
    setBmiHistory(newBmiHistory);
    AsyncStorage.setItem('bmiHistory', JSON.stringify(newBmiHistory));

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
        setPoints(points + 75);
        AsyncStorage.setItem('points', (points + 75).toString());
      }
    }
  };

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const startVoiceControl = () => {
    setIsListening(true);
    showAlert('Voice Control', 'Voice control activated. Try saying "Start workout" or "Log exercise".');
    // Implement actual voice control logic here
  };

  const createCustomExercise = async () => {
    if (!customExerciseName || !customExerciseDescription) {
      showAlert('Missing Information', 'Please provide both name and description for the custom exercise.');
      return;
    }

    try {
      const updatedExercises = await agixtService!.addCustomExercise(userProfile, {
        name: customExerciseName,
        description: customExerciseDescription
      });
      setCustomExercises(updatedExercises);
      setCustomExerciseName('');
      setCustomExerciseDescription('');
      setCustomExerciseModalVisible(false);
      showAlert('Success', 'Custom exercise added successfully!');
      setPoints(points + 15);
      AsyncStorage.setItem('points', (points + 15).toString());
    } catch (error) {
      console.error('Error adding custom exercise:', error);
      showAlert('Error', 'Failed to add custom exercise. Please try again.');
    }
  };

  const trackSoreness = () => {
    showAlert('Track Soreness', 'How sore are you feeling today?');
    // Implement soreness tracking UI here
  };

  const updateSoreness = async (level: string) => {
    if (!workoutPlan) {
      showAlert('Error', 'No workout plan available to adjust.');
      return;
    }

    try {
      const feedback: WorkoutFeedback = {
        workoutId: workoutPlan.conversationName,
        difficulty: level as 'easy' | 'just right' | 'hard',
        completedExercises: []
      };
      const adjustedPlan = await agixtService!.adjustWorkoutPlan(userProfile, feedback);
      setWorkoutPlan(prevPlan => ({
        ...prevPlan!,
        workoutPlan: adjustedPlan
      }));
      setSoreness({ ...soreness, overall: level });
      showAlert('Workout Adjusted', `Your workout has been adjusted based on your ${level} soreness level.`);
    } catch (error) {
      console.error('Error adjusting workout plan:', error);
      showAlert('Error', 'Failed to adjust workout plan. Please try again.');
    }
  };
  
  const saveSettings = async () => {
    if (!apiKey.trim() || !apiUri.trim()) {
      showAlert('Invalid Settings', 'Please enter both API Key and API URI.');
      return;
    }
  
    try {
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
    }
  };

  const checkSettingsConsistency = async () => {
    const storedApiKey = await AsyncStorage.getItem('apiKey');
    const storedApiUri = await AsyncStorage.getItem('apiUri');
    
    if (storedApiKey !== apiKey || storedApiUri !== apiUri) {
      Alert.alert(
        'Settings Mismatch',
        'The current settings do not match the saved settings. Would you like to update?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Update',
            onPress: saveSettings
          }
        ]
      );
    }
  };

  const saveProfile = async () => {
    await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
    await AsyncStorage.setItem('workoutPath', workoutPath);
    setIsFirstLaunch(false);
    await generateWorkoutPlan();
    setProfileModalVisible(false);
    showAlert('Profile Saved', 'Your profile has been updated successfully.');
  };

  const handleWorkoutCompletion = async (difficulty: 'easy' | 'just right' | 'hard') => {
    if (!workoutPlan || !agixtService) return;

    const feedback: WorkoutFeedback = {
      workoutId: workoutPlan.conversationName,
      difficulty,
      completedExercises: workoutPlan.workoutPlan.weeklyPlan.flatMap(day => day.exercises.map(ex => ex.name)),
    };

    setWorkoutFeedback(feedback);

    try {
      await agixtService.logWorkoutCompletion(userProfile, workoutPlan.workoutPlan, feedback);
      setWorkoutPlan({ ...workoutPlan, completed: true });
      await AsyncStorage.setItem('currentWorkoutPlan', JSON.stringify({ ...workoutPlan, completed: true }));
      setFeedbackModalVisible(false);
      const newWorkoutsCompleted = workoutsCompleted + 1;
      setWorkoutsCompleted(newWorkoutsCompleted);
      await AsyncStorage.setItem('workoutsCompleted', newWorkoutsCompleted.toString());
      updateAchievements();
      setPoints(points + 25);
      await AsyncStorage.setItem('points', (points + 25).toString());
      await generateWorkoutPlan();
    } catch (error) {
      console.error('Error logging workout completion:', error);
      showAlert('Error', 'Failed to record workout feedback. Please try again.');
    }
  };

  const updateAchievements = () => {
    const newAchievements = [...achievements];
    if (!newAchievements[0].unlocked) {
      newAchievements[0].unlocked = true;
      showAlert('Achievement Unlocked', 'You completed your first workout!');
      setPoints(points + 50);
    }
    if (workoutsCompleted >= 7 && !newAchievements[1].unlocked) {
      newAchievements[1].unlocked = true;
      showAlert('Achievement Unlocked', 'You completed all workouts for a week!');
      setPoints(points + 100);
    }
    setAchievements(newAchievements);
    AsyncStorage.setItem('achievements', JSON.stringify(newAchievements));
    AsyncStorage.setItem('points', points.toString());
  };

  const refreshMotivationalQuote = async () => {
    if (!agixtService) return;

    try {
      const quote = await agixtService.getMotivationalQuote();
      setMotivationalQuote(quote);
    } catch (error) {
      console.error('Error refreshing motivational quote:', error);
      showAlert('Error', 'Failed to get a new motivational quote. Please try again.');
    }
  };

  const getProgressReport = async () => {
    if (!agixtService) return;

    try {
      const report = await agixtService.getProgressReport(userProfile);
      setProgressReport(report);
      showAlert('Progress Report', report);
    } catch (error) {
      console.error('Error getting progress report:', error);
      showAlert('Error', 'Failed to get your progress report. Please try again.');
    }
  };

  const analyzeFeedback = async (feedback: string) => {
    if (!agixtService) return;
    try {
      const analysis = await agixtService.analyzeFeedback(feedback);
      setFeedbackAnalysis(analysis);
      showAlert('Feedback Analysis', `Sentiment: ${analysis.sentiment}\nCommon Issues: ${analysis.commonIssues.join(', ')}`);
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      showAlert('Error', 'Failed to analyze feedback. Please try again.');
    }
  };

  const generateAdaptiveWorkout = async () => {
    if (!agixtService || !userProfile) return;
    try {
      const previousPerformance = [8, 7, 9, 8, 9, 7, 8, 8, 9, 8]; // Example performance data
      const adaptiveWorkout = await agixtService.getAdaptiveWorkout(userProfile, previousPerformance);
      setAdaptiveWorkoutPlan(adaptiveWorkout);
      showAlert('Adaptive Workout', `New workout plan generated with adaptation level: ${adaptiveWorkout.adaptationLevel.toFixed(2)}`);
    } catch (error) {
      console.error('Error generating adaptive workout:', error);
      showAlert('Error', 'Failed to generate adaptive workout. Please try again.');
    }
  };

  const checkForAnomalies = async () => {
    if (!agixtService) return;
    try {
      const userMetrics = [70, 15, 120, 80, 65]; // Example metrics: weight, body fat %, blood pressure, resting heart rate
      const anomalyResult = await agixtService.detectAnomalies(userMetrics);
      setAnomalyDetectionResult(anomalyResult);
      showAlert('Anomaly Detection', anomalyResult.isAnomaly ? `Anomaly detected: ${anomalyResult.details}` : 'No anomalies detected');
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      showAlert('Error', 'Failed to check for anomalies. Please try again.');
    }
  };

  const getPersonalizedRecommendations = async () => {
    if (!agixtService || !userProfile) return;
    try {
      const userPreferences = ['HIIT', 'yoga', 'protein-rich diet'];
      const recommendations = await agixtService.getPersonalizedRecommendations(userProfile, userPreferences);
      setPersonalizedRecommendation(recommendations);
      showAlert('Personalized Recommendations', 'New recommendations generated. Check the recommendations section for details.');
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      showAlert('Error', 'Failed to get personalized recommendations. Please try again.');
    }
  };

  const generateFitnessForecast = async () => {
    if (!agixtService || !userProfile) return;
    try {
      const historicalData = [
        [70, 16, 0],
        [69.5, 15.8, 0.2],
        [69, 15.5, 0.4],
        [68.8, 15.3, 0.5]
      ]; // Example historical data: [weight, body fat %, muscle gain]
      const forecast = await agixtService.getFitnessForecast(userProfile, historicalData);
      setFitnessForecast(forecast);
      showAlert('Fitness Forecast', 'New fitness forecast generated. Check the forecast section for details.');
    } catch (error) {
      console.error('Error generating fitness forecast:', error);
      showAlert('Error', 'Failed to generate fitness forecast. Please try again.');
    }
  };

  const handleFeedbackSubmission = () => {
    Alert.prompt(
      'Workout Feedback',
      'Please provide feedback on your recent workout:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: (feedback) => {
            if (feedback) {
              analyzeFeedback(feedback);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderSideMenu = () => (
    <View style={[styles.sideMenu, !isSideMenuOpen && styles.sideMenuClosed]}>
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveTab('dashboard')}>
        <Ionicons name="home-outline" size={24} color="#f1c40f" />
        <Text style={styles.menuItemText}>Dashboard</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveTab('workout')}>
        <Ionicons name="fitness-outline" size={24} color="#f1c40f" />
        <Text style={styles.menuItemText}>Workout</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveTab('nutrition')}>
        <Ionicons name="nutrition-outline" size={24} color="#f1c40f" />
        <Text style={styles.menuItemText}>Nutrition</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveTab('progress')}>
        <Ionicons name="trending-up-outline" size={24} color="#f1c40f" />
        <Text style={styles.menuItemText}>Progress</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => setActiveTab('challenges')}>
        <Ionicons name="trophy-outline" size={24} color="#f1c40f" />
        <Text style={styles.menuItemText}>Challenges</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={() => setSettingsModalVisible(true)}>
        <Ionicons name="settings-outline" size={24} color="#f1c40f" />
        <Text style={styles.menuItemText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTopBar = () => (
    <View style={styles.topBar}>
      {!isLargeScreen && (
        <TouchableOpacity onPress={() => setIsSideMenuOpen(!isSideMenuOpen)}>
          <Ionicons name="menu-outline" size={24} color="#f1c40f" />
        </TouchableOpacity>
      )}
      <Text style={styles.topBarTitle}>AGiXT Workouts</Text>
      <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
        <Ionicons name="person-circle-outline" size={24} color="#f1c40f" />
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab 
          userProfile={userProfile} 
          workoutPlan={workoutPlan} 
          points={points}
          motivationalQuote={motivationalQuote}
          refreshQuote={refreshMotivationalQuote}
          onStartWorkout={() => setActiveTab('workout')}
        />;
      case 'workout':
        return <WorkoutTab 
          workoutPlan={workoutPlan} 
          onGenerateWorkout={generateWorkoutPlan} 
          onCompleteWorkout={handleWorkoutCompletion}
          customExercises={customExercises}
          onCreateCustomExercise={() => setCustomExerciseModalVisible(true)}
        />;
      case 'nutrition':
        return <NutritionTab 
          mealPlan={mealPlan} 
          supplements={supplements}
          onUpdateMealPlan={loadMealPlan}
          onViewSupplements={() => setSupplementsModalVisible(true)}
        />;
      case 'progress':
        return <ProgressTab 
          bmiHistory={bmiHistory} 
          progressReport={progressReport}
          onCalculateBMI={() => setBmiModalVisible(true)}
          onGenerateReport={getProgressReport}
          fitnessForecast={fitnessForecast}
          onGenerateForecast={generateFitnessForecast}
        />;
      case 'challenges':
        return <ChallengesTab 
          challenges={challenges} 
          onCompleteChallenge={completeChallenge}
          onRefreshChallenges={loadChallenges}
        />;
      default:
        return <DashboardTab 
          userProfile={userProfile} 
          workoutPlan={workoutPlan} 
          points={points}
          motivationalQuote={motivationalQuote}
          refreshQuote={refreshMotivationalQuote}
          onStartWorkout={() => setActiveTab('workout')}
        />;
    }
  };

  const completeChallenge = async (challengeId: number) => {
    const updatedChallenges = challenges.map(challenge => 
      challenge.id === challengeId ? { ...challenge, completed: true } : challenge
    );
    setChallenges(updatedChallenges);
    await AsyncStorage.setItem('challenges', JSON.stringify(updatedChallenges));
    
    setPoints(points + 50);
    await AsyncStorage.setItem('points', (points + 50).toString());

    // Check for challenge achievement
    const completedChallenges = updatedChallenges.filter(c => c.completed).length;
    if (completedChallenges >= 5 && !achievements[3].unlocked) {
      const newAchievements = [...achievements];
      newAchievements[3].unlocked = true;
      setAchievements(newAchievements);
      await AsyncStorage.setItem('achievements', JSON.stringify(newAchievements));
      showAlert('Achievement Unlocked', 'You completed 5 challenges!');
      setPoints(points + 100);
      await AsyncStorage.setItem('points', (points + 100).toString());
    }

    showAlert('Challenge Completed', 'Congratulations! You\'ve completed a challenge.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.gradient}>
        {renderTopBar()}
        <View style={styles.content}>
          {isLargeScreen && renderSideMenu()}
          <View style={styles.mainContent}>
            {!isLargeScreen && (
              <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('dashboard')}>
                  <Ionicons name="home-outline" size={24} color="#f1c40f" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('workout')}>
                  <Ionicons name="fitness-outline" size={24} color="#f1c40f" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('nutrition')}>
                  <Ionicons name="nutrition-outline" size={24} color="#f1c40f" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('progress')}>
                  <Ionicons name="trending-up-outline" size={24} color="#f1c40f" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('challenges')}>
                  <Ionicons name="trophy-outline" size={24} color="#f1c40f" />
                </TouchableOpacity>
              </View>
            )}
            {renderTabContent()}
          </View>
        </View>
      </LinearGradient>
      <AlertModal
        visible={alertModalVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertModalVisible(false)}
      />
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
              {Object.keys(userProfile).map((key) => (
                <TextInput
                  key={key}
                  style={styles.input}
                  placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={userProfile[key as keyof UserProfile]}
                  onChangeText={(text) => handleInputChange(key as keyof UserProfile, text)}
                  placeholderTextColor="#ccc"
                  keyboardType={key === 'age' || key === 'weight' || key === 'feet' || key === 'inches' || key === 'daysPerWeek' ? 'numeric' : 'default'}
                />
              ))}
              <TextInput
                style={styles.input}
                placeholder="Workout Path (e.g., muscle builder, weight loss)"
                value={workoutPath}
                onChangeText={setWorkoutPath}
                placeholderTextColor="#ccc"
              />
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={saveProfile}>
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setProfileModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={challengesModalVisible}
        onRequestClose={() => setChallengesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Challenges</Text>
            <ScrollView>
              {challenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeItem}>
                  <Text style={styles.challengeName}>{challenge.name}</Text>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>
                  <Text style={styles.challengeDuration}>Duration: {challenge.duration}</Text>
                  <Text style={styles.challengeDifficulty}>Difficulty: {challenge.difficulty}</Text>
                  <TouchableOpacity
                    style={[styles.challengeButton, challenge.completed && styles.challengeCompleted]}
                    onPress={() => completeChallenge(challenge.id)}
                    disabled={challenge.completed}
                  >
                    <Text style={styles.challengeButtonText}>
                      {challenge.completed ? 'Completed' : 'Complete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setChallengesModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={supplementsModalVisible}
        onRequestClose={() => setSupplementsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Supplement Plan</Text>
            <ScrollView>
              {supplements.map((supplement) => (
                <View key={supplement.id} style={styles.supplementItem}>
                  <Text style={styles.supplementName}>{supplement.name}</Text>
                  <Text style={styles.supplementDosage}>Dosage: {supplement.dosage}</Text>
                  <Text style={styles.supplementBenefit}>Benefit: {supplement.benefit}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSupplementsModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={mealPlanModalVisible}
        onRequestClose={() => setMealPlanModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Meal Plan</Text>
            <ScrollView>
              {mealPlan && (
                <>
                  <Text style={styles.mealHeader}>Breakfast:</Text>
                  <Text style={styles.mealContent}>{mealPlan.breakfast}</Text>
                  <Text style={styles.mealHeader}>Lunch:</Text>
                  <Text style={styles.mealContent}>{mealPlan.lunch}</Text>
                  <Text style={styles.mealHeader}>Dinner:</Text>
                  <Text style={styles.mealContent}>{mealPlan.dinner}</Text>
                  <Text style={styles.mealHeader}>Snacks:</Text>
                  {mealPlan.snacks.map((snack, index) => (
                    <Text key={index} style={styles.mealContent}>{snack}</Text>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setMealPlanModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={customExerciseModalVisible}
        onRequestClose={() => setCustomExerciseModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Create Custom Exercise</Text>
            <TextInput
              style={styles.input}
              placeholder="Exercise Name"
              value={customExerciseName}
              onChangeText={setCustomExerciseName}
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Exercise Description"
              value={customExerciseDescription}
              onChangeText={setCustomExerciseDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#ccc"
            />
            <TouchableOpacity style={styles.modalButton} onPress={createCustomExercise}>
              <Text style={styles.modalButtonText}>Create Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setCustomExerciseModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  );
};

const DashboardTab = ({ userProfile, workoutPlan, points, motivationalQuote, refreshQuote, onStartWorkout }: { 
  userProfile: UserProfile, 
  workoutPlan: WorkoutPlanResponse | null, 
  points: number,
  motivationalQuote: string,
  refreshQuote: () => void,
  onStartWorkout: () => void
}) => {
  return (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.tabTitle}>Dashboard</Text>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>Welcome, {userProfile.name}!</Text>
        <Text style={styles.userPoints}>Points: {points}</Text>
      </View>
      {workoutPlan && (
        <View style={styles.nextWorkout}>
          <Text style={styles.nextWorkoutTitle}>Next Workout:</Text>
          <Text style={styles.nextWorkoutInfo}>{workoutPlan.workoutPlan.weeklyPlan[0].day}</Text>
          <TouchableOpacity style={styles.startWorkoutButton} onPress={onStartWorkout}>
            <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.quickStats}>
        <Text style={styles.quickStatsTitle}>Quick Stats</Text>
        <Text style={styles.quickStatsItem}>Weight: {userProfile.weight} lbs</Text>
        <Text style={styles.quickStatsItem}>Goal: {userProfile.goal}</Text>
        <Text style={styles.quickStatsItem}>Fitness Level: {userProfile.fitnessLevel}</Text>
      </View>
      <View style={styles.motivationalQuote}>
        <Text style={styles.motivationalQuoteText}>{motivationalQuote}</Text>
        <TouchableOpacity style={styles.refreshQuoteButton} onPress={refreshQuote}>
          <Ionicons name="refresh-outline" size={24} color="#f1c40f" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const WorkoutTab = ({ workoutPlan, onGenerateWorkout, onCompleteWorkout, customExercises, onCreateCustomExercise }: {
  workoutPlan: WorkoutPlanResponse | null,
  onGenerateWorkout: () => void,
  onCompleteWorkout: (difficulty: 'easy' | 'just right' | 'hard') => void,
  customExercises: CustomExercise[],
  onCreateCustomExercise: () => void
}) => {
  return (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.tabTitle}>Workout</Text>
      {workoutPlan ? (
        <View>
          <Text style={styles.sectionTitle}>{workoutPlan.workoutPlan.weeklyPlan[0].day}</Text>
          {workoutPlan.workoutPlan.weeklyPlan[0].exercises.map((exercise, index) => (
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
      ) : (
        <TouchableOpacity style={styles.generateWorkoutButton} onPress={onGenerateWorkout}>
          <Text style={styles.generateWorkoutButtonText}>Generate Workout Plan</Text>
        </TouchableOpacity>
      )}
      <View style={styles.customExercisesSection}>
        <Text style={styles.sectionTitle}>Custom Exercises</Text>
        {customExercises.map((exercise, index) => (
          <View key={index} style={styles.customExerciseItem}>
            <Text style={styles.customExerciseName}>{exercise.name}</Text>
            <Text style={styles.customExerciseDescription}>{exercise.description}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.createCustomExerciseButton} onPress={onCreateCustomExercise}>
          <Text style={styles.createCustomExerciseButtonText}>Create Custom Exercise</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const NutritionTab = ({ mealPlan, supplements, onUpdateMealPlan, onViewSupplements }: {
  mealPlan: MealPlan | null,
  supplements: Supplement[],
  onUpdateMealPlan: () => void,
  onViewSupplements: () => void
}) => {
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
      <TouchableOpacity style={styles.viewSupplementsButton} onPress={onViewSupplements}>
        <Text style={styles.viewSupplementsButtonText}>View Supplements</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const ProgressTab = ({ bmiHistory, progressReport, onCalculateBMI, onGenerateReport, fitnessForecast, onGenerateForecast }: {
  bmiHistory: {date: string, bmi: number}[],
  progressReport: string,
  onCalculateBMI: () => void,
  onGenerateReport: () => void,
  fitnessForecast: FitnessForecast[],
  onGenerateForecast: () => void
}) => {
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
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
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
      <TouchableOpacity style={styles.generateForecastButton} onPress={onGenerateForecast}>
        <Text style={styles.generateForecastButtonText}>Generate Fitness Forecast</Text>
      </TouchableOpacity>
      {fitnessForecast.length > 0 && (
        <View style={styles.fitnessForecastContainer}>
          <Text style={styles.sectionTitle}>Fitness Forecast</Text>
          {fitnessForecast.map((forecast, index) => (
            <View key={index} style={styles.forecastItem}>
              <Text style={styles.forecastDate}>{new Date(forecast.date).toLocaleDateString()}</Text>
              <Text style={styles.forecastMetric}>Weight: {forecast.predictedMetrics.weight.toFixed(1)} kg</Text>
              <Text style={styles.forecastMetric}>Body Fat: {forecast.predictedMetrics.bodyFat.toFixed(1)}%</Text>
              <Text style={styles.forecastMetric}>Muscle Gain: {forecast.predictedMetrics.muscleGain.toFixed(1)} kg</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const ChallengesTab = ({ challenges, onCompleteChallenge, onRefreshChallenges }: {
  challenges: Challenge[],
  onCompleteChallenge: (challengeId: number) => void,
  onRefreshChallenges: () => void
}) => {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sideMenu: {
    width: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  sideMenuClosed: {
    width: 0,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuItemText: {
    marginLeft: 10,
    color: '#f1c40f',
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 10,
  },
  tab: {
    padding: 10,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  userInfo: {
    marginBottom: 20,
  },
  userName: {
    fontSize: 18,
    color: '#fff',
  },
  userPoints: {
    fontSize: 16,
    color: '#f1c40f',
  },
  nextWorkout: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  nextWorkoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  nextWorkoutInfo: {
    color: '#fff',
  },
  startWorkoutButton: {
    backgroundColor: '#f1c40f',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  startWorkoutButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  quickStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  quickStatsItem: {
    color: '#fff',
    marginBottom: 5,
  },
  motivationalQuote: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  motivationalQuoteText: {
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  refreshQuoteButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 15,
  },
  exerciseItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  exerciseDetail: {
    color: '#ccc',
  },
  completeWorkoutButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  completeWorkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  generateWorkoutButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  generateWorkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customExercisesSection: {
    marginTop: 30,
  },
  customExerciseItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  customExerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  customExerciseDescription: {
    color: '#ccc',
  },
  createCustomExerciseButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  createCustomExerciseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mealPlanContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginTop: 10,
    marginBottom: 5,
  },
  mealContent: {
    color: '#fff',
    marginBottom: 10,
  },
  updateMealPlanButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  updateMealPlanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  generateMealPlanButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  generateMealPlanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  viewSupplementsButton: {
    backgroundColor: '#e67e22',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  viewSupplementsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  calculateBMIButton: {
    backgroundColor: '#9b59b6',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  calculateBMIButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bmiChartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  generateReportButton: {
    backgroundColor: '#1abc9c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateReportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressReportContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  progressReportContent: {
    color: '#fff',
  },
  generateForecastButton: {
    backgroundColor: '#34495e',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateForecastButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fitnessForecastContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  forecastItem: {
    marginBottom: 15,
  },
  forecastDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 5,
  },
  forecastMetric: {
    color: '#fff',
  },
  challengeItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  challengeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
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
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  challengeCompleted: {
    backgroundColor: '#2ecc71',
  },
  challengeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshChallengesButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  refreshChallengesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#34495e',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: '#fff',
  },
  modalButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    marginTop: 10,
  },
  imagePicker: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePickerText: {
    color: '#fff',
    fontSize: 16,
  },
  inputScrollView: {
    maxHeight: 300,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  supplementItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  supplementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 5,
  },
  supplementDosage: {
    color: '#fff',
    marginBottom: 5,
  },
  supplementBenefit: {
    color: '#ccc',
  },
  alertModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertModalContent: {
    backgroundColor: '#34495e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  alertModalMessage: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  alertModalButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
  },
  alertModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  feedbackOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  mealHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginTop: 10,
    marginBottom: 5,
  },
});

export default WorkoutApp;