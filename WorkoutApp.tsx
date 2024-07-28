import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AGiXTService, { UserProfile, WorkoutPlanResponse } from './AGiXTService';

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

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setUserProfile({ ...userProfile, [field]: value });
  };

  const generateWorkoutPlan = async () => {
    const agixtService = new AGiXTService();

    setLoading(true);
    setError(null);

    try {
      const response = await agixtService.createWorkoutPlan(userProfile);
      setWorkoutPlan(response);
    } catch (err) {
      setError('Failed to generate workout plan');
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>AGiXT Workout Planner</Text>

      <TouchableOpacity style={styles.button} onPress={() => setProfileModalVisible(true)}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={generateWorkoutPlan}>
        <Text style={styles.buttonText}>Generate Workout Plan</Text>
      </TouchableOpacity>

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

      <View style={styles.motivationSection}>
        <Text style={styles.sectionHeader}>Motivation</Text>
        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>“The only bad workout is the one that didn’t happen.”</Text>
        </View>
        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>“Push yourself, because no one else is going to do it for you.”</Text>
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
  motivationSection: {
    marginTop: 20,
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
  motivationImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
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
});

export default WorkoutApp;
