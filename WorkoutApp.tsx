// WorkoutApp.tsx

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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
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
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

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

  const initializeFeatures = async () => {
    if (!agixtService) {
      console.error('AGiXT Service is not initialized');
      return;
    }
  
    try {
      if (userProfile.name && userProfile.age && userProfile.gender) {
        const challengesData = await agixtService.getChallenges(userProfile);
        setChallenges(challengesData);
  
        const supplementsData = await agixtService.getSupplements(userProfile);
        setSupplements(supplementsData);
  
        const mealPlanData = await agixtService.getMealPlan(userProfile);
        setMealPlan(mealPlanData);

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
    setPoints(0);
    setLeaderboard([
      { id: 1, name: 'John Doe', points: 1000 },
      { id: 2, name: 'Jane Smith', points: 950 },
    ]);
  };

  const initializeSmartEquipment = () => {
    setConnectedEquipment([
      { id: 1, name: 'Smart Dumbbell', weight: 20 },
      { id: 2, name: 'Smart Resistance Band', resistance: 'Medium' },
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
    }
    setAchievements(newAchievements);
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

    setBmiHistory([...bmiHistory, newBmiEntry]);
    setCurrentWeight('');
    setBmiModalVisible(false);
    showAlert('BMI Calculated', `Your current BMI is ${newBmiEntry.bmi}`);
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
      showAlert(
        'Settings Mismatch',
        'The current settings do not match the saved settings. Would you like to update?'
      );
      // Implement a way for the user to choose to update or not
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
      updateAchievements();
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
    }
    // Add more achievement checks here
    setAchievements(newAchievements);
    setPoints(points + 10);
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

  const renderWorkoutPlan = () => {
    if (!workoutPlan || !workoutPlan.workoutPlan) return null;

    return (
      <View style={styles.workoutPlanContainer}>
        <Text style={styles.planTitle}>Workout Plan:</Text>
        {workoutPlan.workoutPlan.weeklyPlan.map((dayPlan, index) => (
          <View key={index} style={styles.dayPlan}>
            <Text style={styles.dayHeader}>{dayPlan.day}</Text>
            {dayPlan.exercises.map((exercise, exIndex) => (
              <View key={exIndex} style={styles.exercise}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDetail}>Sets: {exercise.sets}</Text>
                <Text style={styles.exerciseDetail}>Reps: {exercise.reps}</Text>
                <Text style={styles.exerciseDetail}>Rest: {exercise.rest}</Text>
                <Text style={styles.exerciseDetail}>Details: {exercise.text}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={styles.nutritionAdvice}>Nutrition Advice: {workoutPlan.workoutPlan.nutritionAdvice}</Text>
        <TouchableOpacity style={styles.feedbackButton} onPress={() => setFeedbackModalVisible(true)}>
          <Text style={styles.feedbackButtonText}>Provide Workout Feedback</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAdaptiveWorkoutPlan = () => {
    if (!adaptiveWorkoutPlan) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Adaptive Workout Plan</Text>
        <Text>Adaptation Level: {adaptiveWorkoutPlan.adaptationLevel.toFixed(2)}</Text>
        {/* Render the workout plan similar to the existing renderWorkoutPlan function */}
      </View>
    );
  };

  const renderPersonalizedRecommendations = () => {
    if (!personalizedRecommendation) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Personalized Recommendations</Text>
        <Text>Recommended Exercises: {personalizedRecommendation.exercises.join(', ')}</Text>
        <Text>Nutrition Advice: {personalizedRecommendation.nutritionAdvice}</Text>
      </View>
    );
  };

  const renderFitnessForecast = () => {
    if (fitnessForecast.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Fitness Forecast</Text>
        {fitnessForecast.map((forecast, index) => (
          <View key={index} style={styles.forecastItem}>
            <Text>Date: {forecast.date}</Text>
            <Text>Predicted Weight: {forecast.predictedMetrics.weight.toFixed(1)} kg</Text>
            <Text>Predicted Body Fat: {forecast.predictedMetrics.bodyFat.toFixed(1)}%</Text>
            <Text>Predicted Muscle Gain: {forecast.predictedMetrics.muscleGain.toFixed(1)} kg</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAIInsights = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>AI Insights</Text>
        {feedbackAnalysis && (
          <View style={styles.insightItem}>
            <Text style={styles.insightTitle}>Latest Feedback Analysis:</Text>
            <Text>Sentiment: {feedbackAnalysis.sentiment}</Text>
            <Text>Top Issue: {feedbackAnalysis.commonIssues[0]}</Text>
          </View>
        )}
        {anomalyDetectionResult && (
          <View style={styles.insightItem}>
            <Text style={styles.insightTitle}>Anomaly Detection:</Text>
            <Text>{anomalyDetectionResult.isAnomaly ? 'Anomaly Detected' : 'No Anomalies'}</Text>
          </View>
        )}
        {adaptiveWorkoutPlan && (
          <View style={styles.insightItem}>
            <Text style={styles.insightTitle}>Workout Adaptation Level:</Text>
            <Text>{adaptiveWorkoutPlan.adaptationLevel.toFixed(2)}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isFirstLaunch ? (
          <View>
            <Text style={styles.headerText}>Welcome to the Workout App!</Text>
            <Text style={styles.subHeaderText}>Let's set up your profile:</Text>
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
            <TouchableOpacity style={styles.button} onPress={saveProfile}>
              <Text style={styles.buttonText}>Save Profile and Start</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={80} color="#f1c40f" />
              )}
              <Text style={styles.headerText}>Welcome, {userProfile.name || 'Fitness Warrior'}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="medal-outline" size={24} color="#f1c40f" />
                <Text style={styles.statValue}>{points}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="barbell-outline" size={24} color="#f1c40f" />
                <Text style={styles.statValue}>{workoutPlan?.workoutPlan?.weeklyPlan?.length || 0}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="flame-outline" size={24} color="#f1c40f" />
                <Text style={styles.statValue}>{challenges.length}</Text>
                <Text style={styles.statLabel}>Challenges</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={generateWorkoutPlan}>
              <Ionicons name="fitness-outline" size={24} color="#121212" />
              <Text style={styles.buttonText}>Generate Workout Plan</Text>
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setProfileModalVisible(true)}>
                <Ionicons name="person-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setBmiModalVisible(true)}>
                <Ionicons name="calculator-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>BMI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setChallengesModalVisible(true)}>
                <Ionicons name="trophy-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Challenges</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setMealPlanModalVisible(true)}>
                <Ionicons name="nutrition-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Meal Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setSupplementsModalVisible(true)}>
                <Ionicons name="flask-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Supplements</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setCustomExerciseModalVisible(true)}>
                <Ionicons name="add-circle-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Custom Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={startVoiceControl}>
                <Ionicons name="mic-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Voice Control</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={trackSoreness}>
                <Ionicons name="body-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Track Soreness</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  setSettingsModalVisible(true);
                  checkSettingsConsistency();
                }}
              >
                <Ionicons name="settings-outline" size={24} color="#f1c40f" />
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aiFeatures}>
              <TouchableOpacity style={styles.aiFeatureButton} onPress={handleFeedbackSubmission}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#f1c40f" />
                <Text style={styles.aiFeatureButtonText}>Analyze Feedback</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiFeatureButton} onPress={generateAdaptiveWorkout}>
                <Ionicons name="fitness-outline" size={24} color="#f1c40f" />
                <Text style={styles.aiFeatureButtonText}>Adaptive Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiFeatureButton} onPress={checkForAnomalies}>
                <Ionicons name="warning-outline" size={24} color="#f1c40f" />
                <Text style={styles.aiFeatureButtonText}>Check Anomalies</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiFeatureButton} onPress={getPersonalizedRecommendations}>
                <Ionicons name="bulb-outline" size={24} color="#f1c40f" />
                <Text style={styles.aiFeatureButtonText}>Get Recommendations</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiFeatureButton} onPress={generateFitnessForecast}>
                <Ionicons name="trending-up-outline" size={24} color="#f1c40f" />
                <Text style={styles.aiFeatureButtonText}>Fitness Forecast</Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator size="large" color="#f1c40f" style={styles.loading} />}
            {error && <Text style={styles.error}>{error}</Text>}
            
            {renderWorkoutPlan()}
            {renderAdaptiveWorkoutPlan()}
            {renderPersonalizedRecommendations()}
            {renderFitnessForecast()}
            {renderAIInsights()}

            {bmiHistory.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>BMI History</Text>
                <LineChart
                  data={{
                    labels: bmiHistory.map(entry => new Date(entry.date).toLocaleDateString()),
                    datasets: [
                      {
                        data: bmiHistory.map(entry => entry.bmi),
                        color: (opacity = 1) => `rgba(241, 196, 15, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={width - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#1e1e1e',
                    backgroundGradientFrom: '#302b63',
                    backgroundGradientTo: '#24243e',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(241, 196, 15, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#f1c40f',
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
                <Text style={styles.bmiCategory}>
                  Current BMI Category: {getBmiCategory(bmiHistory[bmiHistory.length - 1].bmi)}
                </Text>
              </View>
            )}

            <View style={styles.motivationSection}>
              <Text style={styles.sectionHeader}>Motivation</Text>
              <View style={styles.quoteContainer}>
                <Text style={styles.quote}>{motivationalQuote}</Text>
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={refreshMotivationalQuote}>
                <Ionicons name="refresh-outline" size={24} color="#f1c40f" />
                <Text style={styles.refreshButtonText}>New Quote</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={getProgressReport}>
              <Ionicons name="stats-chart-outline" size={24} color="#121212" />
              <Text style={styles.buttonText}>Get Progress Report</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Modals */}
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
                    onPress={() => {/* Implement challenge completion logic */}}
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
            <TouchableOpacity style={styles.cancelButton} onPress={() => setFeedbackModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={alertModalVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertModalVisible(false)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginTop: 10,
  },
  subHeaderText: {
    fontSize: 18,
    color: '#f1c40f',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#f1c40f',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
  },
  button: {
    backgroundColor: '#f1c40f',
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: (width - 60) / 2,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#f1c40f',
    marginTop: 5,
    fontSize: 12,
  },
  workoutPlanContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  dayPlan: {
    marginBottom: 15,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 8,
  },
  exercise: {
    marginBottom: 8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseDetail: {
    color: '#ccc',
    fontSize: 14,
  },
  nutritionAdvice: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bmiCategory: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  motivationSection: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  quoteContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#fff',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 10,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#f1c40f',
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#24243e',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#f1c40f',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    color: '#fff',
  },
  feedbackButton: {
    backgroundColor: '#f1c40f',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  feedbackButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  feedbackOption: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
  },
  feedbackOptionText: {
    color: '#f1c40f',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f1c40f',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#f1c40f',
  },
  loading: {
    marginVertical: 20,
  },
  error: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  imagePicker: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerText: {
    color: '#f1c40f',
  },
  modalButton: {
    backgroundColor: '#f1c40f',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  modalButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  challengeItem: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  challengeName: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  challengeDescription: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
  },
  challengeDuration: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
  },
  challengeDifficulty: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
  },
  challengeButton: {
    backgroundColor: '#f1c40f',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  challengeCompleted: {
    backgroundColor: '#2ecc71',
  },
  challengeButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  mealHeader: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 15,
  },
  mealContent: {
    color: '#fff',
    marginBottom: 10,
    fontSize: 14,
  },
  supplementItem: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  supplementName: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  supplementDosage: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
  },
  supplementBenefit: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  alertModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertModalContent: {
    backgroundColor: '#24243e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  alertModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  alertModalMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  alertModalButton: {
    backgroundColor: '#f1c40f',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  alertModalButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  inputScrollView: {
    maxHeight: 300,
  },
  aiFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  aiFeatureButton: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: '45%',
    marginBottom: 15,
  },
  aiFeatureButtonText: {
    color: '#f1c40f',
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  forecastItem: {
    marginBottom: 10,
  },
  insightItem: {
    marginBottom: 10,
  },
  insightTitle: {
    fontWeight: 'bold',
    color: '#f1c40f',
  },
});

export default WorkoutApp;