import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, Alert } from 'react-native';
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
      setWorkoutPlan(response);
      setPoints(points + 10);
      checkAchievements();
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>AGiXT Fitness Pro</Text>

      <TouchableOpacity style={styles.button} onPress={() => setProfileModalVisible(true)}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={generateWorkoutPlan}>
        <Text style={styles.buttonText}>Generate Workout Plan</Text>
      </TouchableOpacity>

      <View style={styles.featuresContainer}>
        <TouchableOpacity style={styles.featureButton} onPress={() => Alert.alert('Gamification', `Points: ${points}`)}>
          <Text style={styles.featureButtonText}>View Points</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={() => setChallengesModalVisible(true)}>
          <Text style={styles.featureButtonText}>Challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={() => Alert.alert('Smart Equipment', `Connected: ${connectedEquipment.map(e => e.name).join(', ')}`)}>
          <Text style={styles.featureButtonText}>Smart Equipment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={startVoiceControl}>
          <Text style={styles.featureButtonText}>{isListening ? 'Listening...' : 'Start Voice Control'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={() => setSupplementsModalVisible(true)}>
          <Text style={styles.featureButtonText}>Supplement Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={() => setCustomExerciseModalVisible(true)}>
          <Text style={styles.featureButtonText}>Create Exercise</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={trackSoreness}>
          <Text style={styles.featureButtonText}>Track Soreness</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={() => setMealPlanModalVisible(true)}>
          <Text style={styles.featureButtonText}>View Meal Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureButton} onPress={() => setBmiModalVisible(true)}>
          <Text style={styles.featureButtonText}>Calculate BMI</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#f1c40f" style={styles.loading} />}
      {error && <Text style={styles.error}>{error}</Text>}
      
      {workoutPlan && (
        <View style={styles.workoutPlan}>
          <Text style={styles.planHeader}>Workout Plan:</Text>
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
                  color: (opacity = 1) => `rgba(255, 204, 0, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            }}
            width={320}
            height={220}
            chartConfig={{
              backgroundColor: '#1e1e1e',
              backgroundGradientFrom: '#1e1e1e',
              backgroundGradientTo: '#1e1e1e',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
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
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={userProfile.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholderTextColor="#ccc"
              />
<TextInput
                style={styles.input}
                placeholder="Age"
                value={userProfile.age}
                onChangeText={(text) => handleInputChange('age', text)}
                keyboardType="numeric"
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                placeholder="Gender"
                value={userProfile.gender}
                onChangeText={(text) => handleInputChange('gender', text)}
                placeholderTextColor="#ccc"
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Feet"
                  value={userProfile.feet}
                  onChangeText={(text) => handleInputChange('feet', text)}
                  keyboardType="numeric"
                  placeholderTextColor="#ccc"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Inches"
                  value={userProfile.inches}
                  onChangeText={(text) => handleInputChange('inches', text)}
                  keyboardType="numeric"
                  placeholderTextColor="#ccc"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Weight (lbs)"
                value={userProfile.weight}
                onChangeText={(text) => handleInputChange('weight', text)}
                keyboardType="numeric"
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                placeholder="Goal"
                value={userProfile.goal}
                onChangeText={(text) => handleInputChange('goal', text)}
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                placeholder="Fitness Level"
                value={userProfile.fitnessLevel}
                onChangeText={(text) => handleInputChange('fitnessLevel', text)}
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                placeholder="Days Per Week"
                value={userProfile.daysPerWeek}
                onChangeText={(text) => handleInputChange('daysPerWeek', text)}
                keyboardType="numeric"
                placeholderTextColor="#ccc"
              />
              <TextInput
                style={styles.input}
                placeholder="Bio"
                value={userProfile.bio}
                onChangeText={(text) => handleInputChange('bio', text)}
                placeholderTextColor="#ccc"
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Interests"
                value={userProfile.interests}
                onChangeText={(text) => handleInputChange('interests', text)}
                placeholderTextColor="#ccc"
              />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f1c40f',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#f1c40f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  loading: {
    marginBottom: 20,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  workoutPlan: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  planHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 10,
  },
  dayPlan: {
    marginBottom: 15,
  },
  dayHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1c40f',
    marginBottom: 5,
  },
  exercise: {
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  exerciseDetail: {
    color: '#ccc',
  },
  nutritionAdvice: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1c40f',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureButton: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
  },
  featureButtonText: {
    color: '#f1c40f',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
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
    color: '#ccc',
    marginBottom: 10,
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
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1c40f',
    textAlign: 'center',
    marginBottom: 20,
  },
  imagePicker: {
    backgroundColor: '#2c2c2c',
    borderWidth: 1,
    borderColor: '#f1c40f',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerText: {
    color: '#ccc',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#f1c40f',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#2c2c2c',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    flex: 1,
    marginRight: 10,
  },
  modalButton: {
    backgroundColor: '#f1c40f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  challengeItem: {
    backgroundColor: '#2c3e50',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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
    padding: 5,
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
    backgroundColor: '#2c3e50',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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
    marginTop: 10,
  },
  mealContent: {
    color: '#fff',
    marginBottom: 5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default WorkoutApp;
