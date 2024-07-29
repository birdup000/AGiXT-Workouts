import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import AGiXTService, { UserProfile, WorkoutPlanResponse, Challenge, Supplement, MealPlan, CustomExercise } from './AGiXTService';
import { LineChart } from 'react-native-chart-kit';

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
  const [leaderboard, setLeaderboard] = useState([]);
  const [connectedEquipment, setConnectedEquipment] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [soreness, setSoreness] = useState({});
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

  const agixtService = new AGiXTService();

  useEffect(() => {
    initializeFeatures();
  }, []);

  const initializeFeatures = async () => {
    try {
      const challengesData = await agixtService.getChallenges(userProfile);
      setChallenges(challengesData);

      const supplementsData = await agixtService.getSupplements(userProfile);
      setSupplements(supplementsData);

      const mealPlanData = await agixtService.getMealPlan(userProfile);
      setMealPlan(mealPlanData);

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
      const updatedExercises = await agixtService.addCustomExercise(userProfile, {
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
      const adjustedPlan = await agixtService.adjustWorkoutPlan(userProfile, workoutPlan, level);
      setWorkoutPlan(adjustedPlan);
      setSoreness({ ...soreness, overall: level });
      Alert.alert('Workout Adjusted', `Your workout has been adjusted based on your ${level} soreness level.`);
    } catch (error) {
      console.error('Error adjusting workout plan:', error);
      Alert.alert('Error', 'Failed to adjust workout plan. Please try again.');
    }
  };

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
        </View>

        {loading && <ActivityIndicator size="large" color="#f1c40f" style={styles.loading} />}
        {error && <Text style={styles.error}>{error}</Text>}
        
        {workoutPlan && workoutPlan.workoutPlan && workoutPlan.workoutPlan.weeklyPlan && (
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
          </View>
        )}

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
              width={320}
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
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Save</Text>
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
              <TouchableOpacity style={styles.modalButton} onPress={() => setBmiModalVisible(false)}>
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
              <TouchableOpacity style={styles.modalButton} onPress={() => setChallengesModalVisible(false)}>
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
              {supplements.map((supplement) => (
                <View key={supplement.id} style={styles.supplementItem}>
                  <Text style={styles.supplementName}>{supplement.name}</Text>
                  <Text style={styles.supplementDosage}>{supplement.dosage}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.modalButton} onPress={() => setSupplementsModalVisible(false)}>
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
              <TouchableOpacity style={styles.modalButton} onPress={() => setMealPlanModalVisible(false)}>
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
              <TouchableOpacity style={styles.modalButton} onPress={() => setCustomExerciseModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    marginBottom: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginTop: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#f1c40f',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
  },
  button: {
    backgroundColor: '#f1c40f',
    padding: 15,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#f1c40f',
    marginTop: 5,
  },
  workoutPlanContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 15,
  },
  dayPlan: {
    marginBottom: 15,
  },
  dayHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  exercise: {
    marginBottom: 10,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseDetail: {
    color: '#ccc',
    fontSize: 14,
  },
  nutritionAdvice: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 20,
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
    fontSize: 16,
  },
  motivationSection: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  quoteContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  quote: {
    fontSize: 18,
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerText: {
    color: '#f1c40f',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#f1c40f',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    color: '#fff',
  },
  modalButton: {
    backgroundColor: '#f1c40f',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
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
    fontSize: 18,
  },
  challengeDescription: {
    color: '#fff',
    marginTop: 5,
  },
  challengeButton: {
    backgroundColor: '#f1c40f',
    padding: 10,
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
    fontSize: 18,
  },
  supplementDosage: {
    color: '#fff',
    marginTop: 5,
  },
  mealHeader: {
    color: '#f1c40f',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 15,
  },
  mealContent: {
    color: '#fff',
    marginBottom: 10,
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
    fontSize: 16,
  },
});

export default WorkoutApp;