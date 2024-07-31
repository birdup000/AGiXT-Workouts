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
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AGiXTService, {
  UserProfile,
  WorkoutPlanResponse,
  Challenge,
  Supplement,
  MealPlan,
  CustomExercise,
  WorkoutFeedback
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

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedApiKey = await AsyncStorage.getItem('apiKey');
        const storedApiUri = await AsyncStorage.getItem('apiUri');
        
        if (storedApiKey && storedApiUri) {
          setApiKey(storedApiKey);
          setApiUri(storedApiUri);
          const service = new AGiXTService();
          service.updateSettings(storedApiUri, storedApiKey);
          await service.initializeWorkoutAgent();
          setAgixtService(service);
          
          await initializeFeatures();
        } else {
          const service = new AGiXTService();
          await service.initializeWorkoutAgent();
          setAgixtService(service);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        Alert.alert('Error', 'Failed to initialize the app. Please restart.');
      }
    };
  
    initializeApp();
  }, []);

  useEffect(() => {
    if (agixtService) {
      initializeFeatures();
    }
  }, [agixtService]);

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
      Alert.alert('Permission required', 'Microphone access is needed for voice control.');
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
      Alert.alert('Error', 'AGiXT Service is not initialized yet.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await agixtService.createWorkoutPlan(userProfile);
      if (response && response.workoutPlan) {
        setWorkoutPlan(response);
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
      Alert.alert('Achievement Unlocked', 'You completed your first workout!');
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
      Alert.alert('Missing Information', 'Please ensure weight, feet, and inches are filled in.');
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
    Alert.alert('BMI Calculated', `Your current BMI is ${newBmiEntry.bmi}`);
  };

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const startVoiceControl = () => {
    setIsListening(true);
    Alert.alert('Voice Control', 'Voice control activated. Try saying "Start workout" or "Log exercise".');
  };

  const createCustomExercise = async () => {
    if (!customExerciseName || !customExerciseDescription) {
      Alert.alert('Missing Information', 'Please provide both name and description for the custom exercise.');
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
      Alert.alert('Success', 'Custom exercise added successfully!');
    } catch (error) {
      console.error('Error adding custom exercise:', error);
      Alert.alert('Error', 'Failed to add custom exercise. Please try again.');
    }
  };

  const trackSoreness = () => {
    Alert.alert('Track Soreness', 'How sore are you feeling today?', [
      { text: 'Low', onPress: () => updateSoreness('low') },
      { text: 'Medium', onPress: () => updateSoreness('medium') },
      { text: 'High', onPress: () => updateSoreness('high') },
    ]);
  };

  const updateSoreness = async (level: string) => {
    if (!workoutPlan) {
      Alert.alert('Error', 'No workout plan available to adjust.');
      return;
    }

    try {
      const adjustedPlan = await agixtService!.adjustWorkoutPlan(userProfile, workoutPlan, level);
      setWorkoutPlan(adjustedPlan);
      setSoreness({ ...soreness, overall: level });
      Alert.alert('Workout Adjusted', `Your workout has been adjusted based on your ${level} soreness level.`);
    } catch (error) {
      console.error('Error adjusting workout plan:', error);
      Alert.alert('Error', 'Failed to adjust workout plan. Please try again.');
    }
  };
  
  const saveSettings = async () => {
    if (!apiKey.trim() || !apiUri.trim()) {
      Alert.alert('Invalid Settings', 'Please enter both API Key and API URI.');
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
      
      Alert.alert('Settings Saved', 'Your AGiXT settings have been updated and saved.');
      
      initializeFeatures();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
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
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: saveSettings }
        ]
      );
    }
  };

  const saveProfile = () => {
    setProfileModalVisible(false);
    Alert.alert('Profile Saved', 'Your profile has been updated successfully.');
  };

  const handleWorkoutCompletion = async (difficulty: 'easy' | 'just right' | 'hard', completedExercises: string[]) => {
    if (!workoutPlan || !agixtService) return;

    const feedback: WorkoutFeedback = {
      workoutId: workoutPlan.conversationName,
      difficulty,
      completedExercises,
    };

    setWorkoutFeedback(feedback);

    try {
      await agixtService.logWorkoutCompletion(userProfile, workoutPlan.workoutPlan, feedback);
      Alert.alert('Feedback Recorded', 'Your workout feedback has been recorded and will be used to improve future workouts.');
    } catch (error) {
      console.error('Error logging workout completion:', error);
      Alert.alert('Error', 'Failed to record workout feedback. Please try again.');
    }
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

const renderFeedbackModal = () => (
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
       <TouchableOpacity style={styles.feedbackOption} onPress={() => handleWorkoutCompletion('easy', [])}>
         <Text style={styles.feedbackOptionText}>Easy</Text>
       </TouchableOpacity>
       <TouchableOpacity style={styles.feedbackOption} onPress={() => handleWorkoutCompletion('just right', [])}>
         <Text style={styles.feedbackOptionText}>Just Right</Text>
       </TouchableOpacity>
       <TouchableOpacity style={styles.feedbackOption} onPress={() => handleWorkoutCompletion('hard', [])}>
         <Text style={styles.feedbackOptionText}>Hard</Text>
       </TouchableOpacity>
       <TouchableOpacity style={styles.cancelButton} onPress={() => setFeedbackModalVisible(false)}>
         <Text style={styles.cancelButtonText}>Cancel</Text>
       </TouchableOpacity>
     </View>
   </View>
 </Modal>
);

const renderProfileModal = () => (
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
       <View style={styles.inputContainer}>
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
       </View>
       <TouchableOpacity style={styles.modalButton} onPress={saveProfile}>
         <Text style={styles.modalButtonText}>Save</Text>
       </TouchableOpacity>
       <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setProfileModalVisible(false)}>
         <Text style={styles.modalButtonText}>Cancel</Text>
       </TouchableOpacity>
     </View>
   </View>
 </Modal>
);

const renderBmiModal = () => (
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
);

const renderChallengesModal = () => (
 <Modal
   animationType="slide"
   transparent={true}
   visible={challengesModalVisible}
   onRequestClose={() => setChallengesModalVisible(false)}
 >
   <View style={styles.modalContainer}>
     <View style={styles.modalContent}>
       <Text style={styles.modalHeader}>Challenges</Text>
       {challenges.map((challenge) => (
         <View key={challenge.id} style={styles.challengeItem}>
           <Text style={styles.challengeName}>{challenge.name}</Text>
           <Text style={styles.challengeDescription}>{challenge.description}</Text>
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
       <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setChallengesModalVisible(false)}>
         <Text style={styles.modalButtonText}>Close</Text>
       </TouchableOpacity>
     </View>
   </View>
 </Modal>
);

const renderMealPlanModal = () => (
 <Modal
   animationType="slide"
   transparent={true}
   visible={mealPlanModalVisible}
   onRequestClose={() => setMealPlanModalVisible(false)}
 >
   <View style={styles.modalContainer}>
     <View style={styles.modalContent}>
       <Text style={styles.modalHeader}>Meal Plan</Text>
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
       <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setMealPlanModalVisible(false)}>
         <Text style={styles.modalButtonText}>Close</Text>
       </TouchableOpacity>
     </View>
   </View>
 </Modal>
);

const renderSupplementsModal = () => (
 <Modal
   animationType="slide"
   transparent={true}
   visible={supplementsModalVisible}
   onRequestClose={() => setSupplementsModalVisible(false)}
 >
   <View style={styles.modalContainer}>
     <View style={styles.modalContent}>
       <Text style={styles.modalHeader}>Supplement Plan</Text>
       {supplements.map((supplement) => (
         <View key={supplement.id} style={styles.supplementItem}>
           <Text style={styles.supplementName}>{supplement.name}</Text>
           <Text style={styles.supplementDosage}>{supplement.dosage}</Text>
         </View>
       ))}
       <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSupplementsModalVisible(false)}>
         <Text style={styles.modalButtonText}>Close</Text>
       </TouchableOpacity>
     </View>
   </View>
 </Modal>
);

const renderCustomExerciseModal = () => (
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
);

const renderSettingsModal = () => (
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
);

return (
 <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
   <ScrollView contentContainerStyle={styles.scrollContent}>
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

        {loading && <ActivityIndicator size="large" color="#f1c40f" style={styles.loading} />}
        {error && <Text style={styles.error}>{error}</Text>}
        
        {renderWorkoutPlan()}

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
            <Text style={styles.quote}>"The only bad workout is the one that didn't happen."</Text>
          </View>
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>"Push yourself, because no one else is going to do it for you."</Text>
          </View>
        </View>

        {renderFeedbackModal()}
        {renderProfileModal()}
        {renderBmiModal()}
        {renderChallengesModal()}
        {renderMealPlanModal()}
        {renderSupplementsModal()}
        {renderCustomExerciseModal()}
        {renderSettingsModal()}
      </ScrollView>
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
  inputContainer: {
    marginBottom: 15,
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
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f1c40f',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#f1c40f',
    fontSize: 16,
  },
});

export default WorkoutApp;