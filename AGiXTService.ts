import axios from 'axios';

interface ActivitySummaryRecord {
  activityType: string;
  duration: number;
}

export interface UserProfile {
  name: string;
  age: string;
  gender: string;
  feet: string;
  inches: string;
  weight: string;
  goal: string;
  fitnessLevel: string;
  daysPerWeek: string;
  bio: string;
  interests: string;
  profileImage: string | null;
  level: number;
  experiencePoints: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string;
  coins: number;
  unlockedAchievements: string[];
  friends: string[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  text?: string;
}

export interface DayPlan {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  weeklyPlan: DayPlan[];
  nutritionAdvice: string;
}

export interface WorkoutPlanResponse {
  conversationName: string;
  workoutPlan: WorkoutPlan;
  completed: boolean;
  difficulty: number;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  duration: string;
  difficulty: string;
  completed: boolean;
}

export interface Supplement {
  id: number;
  name: string;
  dosage: string;
  benefit: string;
}

export interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string[];
}

export interface CustomExercise {
  id: number;
  name: string;
  description: string;
}

export interface WorkoutFeedback {
  workoutId: string;
  difficulty: 'easy' | 'just right' | 'hard';
  completedExercises: string[];
}

export interface FeedbackAnalysis {
  sentiment: string;
  commonIssues: string[];
}

export interface AdaptiveWorkoutPlan extends WorkoutPlan {
  adaptationLevel: number;
  recommendedDifficulty: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  details: string;
}

export interface PersonalizedRecommendation {
  workoutPlan: WorkoutPlan;
  focusAreas: string[];
  recommendedExercises: string[];
  nutritionTips: string[];
}

export interface FitnessForecast {
  date: string;
  predictedMetrics: {
    weight: number;
    bodyFat: number;
    muscleGain: number;
  };
}

export interface WorkoutPreferences {
  location: string;
  space: string;
  equipment: string[];
}

export interface SocialChallenge {
  id: string;
  creatorId: string;
  participantIds: string[];
  challengeName: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: number;
  unit: string;
}

export interface ProgressReport {
  summary: string;
  workoutProgress: {
    totalWorkouts: number;
    averageDifficulty: number;
    mostImprovedExercises: string[];
  };
  bodyCompositionChanges: {
    weightChange: number;
    bodyFatPercentageChange: number;
  };
  recommendations: string[];
}

export interface BodyMeasurements {
  date: string;
  weight: number;
  bodyFatPercentage: number;
  measurements: {
    [key: string]: number;
  };
}

interface WorkoutAnalysis {
  recommendation: string;
  warning: boolean;
}

class AGiXTService {
  public baseUri: string;
  public headers: { [key: string]: string };
  public agentName: string = 'WorkoutAgent';
  private isDemoMode: boolean;

  constructor(isDemoMode: boolean) {
    this.baseUri = '';
    this.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    this.isDemoMode = isDemoMode;
  }

  public updateSettings(newUri: string, newApiKey: string) {
    this.baseUri = newUri;
    this.headers = {
      ...this.headers,
      'Authorization': `Bearer ${newApiKey}`,
    };
  }

  private async request(method: string, endpoint: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUri}${endpoint}`,
        headers: this.headers,
        data,
      });
      return response.data;
    } catch (error) {
      console.error(`Error in ${method} request to ${endpoint}:`, error);
      throw error;
    }
  }

  public async getAgents(): Promise<any> {
    return this.request('get', '/api/agent');
  }

  public async addAgent(agentName: string, settings: any = {}): Promise<any> {
    return this.request('post', '/api/agent', { agent_name: agentName, settings });
  }

  public async newConversation(agentName: string, conversationName: string, conversationContent: any[] = []): Promise<any> {
    return this.request('post', '/api/conversation', {
      conversation_name: conversationName,
      agent_name: agentName,
      conversation_content: conversationContent,
    });
  }

  public async chat(agentName: string, userInput: string, conversationName: string, contextResults = 4): Promise<any> {
    return this.request('post', `/api/agent/${agentName}/prompt`, {
      prompt_name: 'Chat',
      prompt_args: {
        user_input: userInput,
        context_results: contextResults,
        conversation_name: conversationName,
        disable_memory: true,
      },
    });
  }

  public async newConversationMessage(role: string, message: string, conversationName: string): Promise<any> {
    return this.request('post', '/api/conversation/message', {
      role,
      message,
      conversation_name: conversationName,
    });
  }

  public async initializeWorkoutAgent(): Promise<void> {
    try {
      const agentsResponse = await this.getAgents();
      const agents = agentsResponse.agents || [];
      if (!agents.some((agent: any) => agent.name === this.agentName)) {
        await this.createWorkoutAgent();
      }
    } catch (error) {
      console.error('Error initializing WorkoutAgent:', error);
      throw error;
    }
  }

  private async createWorkoutAgent(): Promise<void> {
    const settings = {
      provider: 'gpt4free',
      AI_MODEL: 'gpt-3.5-turbo',
      AI_TEMPERATURE: 0.7,
      MAX_TOKENS: 4000,
      embedder: 'default',
    };

    try {
      await this.addAgent(this.agentName, settings);
      console.log('WorkoutAgent created successfully');
    } catch (error) {
      console.error('Error creating WorkoutAgent:', error);
      throw error;
    }
  }

  public extractJson(response: any): any {
    let jsonResponse: any;

    if (typeof response === 'string') {
      try {
        jsonResponse = JSON.parse(response);
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            jsonResponse = JSON.parse(match[0]);
          } catch (innerError) {
            console.error("Failed to parse extracted JSON:", innerError);
            try {
              const truncatedResponse = response.substring(0, response.lastIndexOf('}') + 1);
              jsonResponse = JSON.parse(truncatedResponse);
            } catch (finalError) {
              console.error("Failed to parse truncated response as JSON:", finalError);
              throw new Error("Failed to extract valid JSON from response");
            }
          }
        } else {
          throw new Error("No valid JSON found in the response");
        }
      }
    } else if (typeof response === 'object' && response !== null) {
      if (response.response) {
        try {
          jsonResponse = JSON.parse(response.response);
        } catch (error) {
          console.error("Failed to parse response.response as JSON:", error);
          try {
            const truncatedResponse = response.response.substring(0, response.response.lastIndexOf('}') + 1);
            jsonResponse = JSON.parse(truncatedResponse);
          } catch (finalError) {
            console.error("Failed to parse truncated response.response as JSON:", finalError);
            throw new Error("Failed to parse response.response as JSON");
          }
        }
      } else {
        jsonResponse = response;
      }
    } else {
      throw new Error("Response is neither a string nor an object");
    }

    return jsonResponse;
  }

  public async generateMultipleWorkouts(preferences: WorkoutPreferences, userProfile: UserProfile, count: number = 3, bodyPart: string | null = null): Promise<WorkoutPlanResponse[]> {
    if (this.isDemoMode) {
      // Return dummy workout data
      return [
        {
          conversationName: 'DemoWorkout_1',
          workoutPlan: {
            weeklyPlan: [
              {
                day: 'Day 1 - Chest & Triceps',
                focus: 'Strength', 
                exercises: [
                  { name: 'Bench Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                  { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                  { name: 'Dumbbell Flyes', sets: 3, reps: '10-15', rest: '60 seconds' },
                  { name: 'Close-Grip Bench Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                  { name: 'Triceps Pushdowns', sets: 3, reps: '12-15', rest: '60 seconds' },
                ],
              },
              {
                day: 'Day 2 - Back & Biceps',
                focus: 'Strength', 
                exercises: [
                  { name: 'Pull-ups', sets: 3, reps: 'As many as possible', rest: '60 seconds' },
                  { name: 'Barbell Rows', sets: 3, reps: '8-12', rest: '60 seconds' },
                  { name: 'Lat Pulldowns', sets: 3, reps: '10-15', rest: '60 seconds' },
                  { name: 'Dumbbell Curls', sets: 3, reps: '10-12', rest: '60 seconds' },
                  { name: 'Hammer Curls', sets: 3, reps: '12-15', rest: '60 seconds' },
                ],
              },
            ],
            nutritionAdvice: 'Eat plenty of protein and complex carbohydrates.',
          },
          completed: false,
          difficulty: 3,
        },
      ];
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `MultipleWorkouts_${Date.now()}`;
      const generatedWorkouts: any[] = [];
      const workoutNames = new Set();

      try {
        await this.newConversation(this.agentName, conversationName);

        const chunkSize = Math.ceil(count / 3);
        for (let i = 0; i < count; i += chunkSize) {
          const numToGenerate = Math.min(chunkSize, count - i);
          const prompt = `Generate ${numToGenerate} unique workout plans for a ${userProfile.gender} aged ${userProfile.age} with a fitness level of ${userProfile.fitnessLevel} and the following preferences:
            Location: ${preferences.location}
            Available space: ${preferences.space}
            Equipment: ${preferences.equipment.join(', ')}
            Fitness goal: ${userProfile.goal}
            ${bodyPart ? `Focus on: ${bodyPart}` : ''} 

            Each workout plan should be suitable for the given preferences and include:
            1. A unique name for the workout
            2. 5-7 exercises
            3. For each exercise: name, sets, reps, rest time, and any additional instructions
            4. A difficulty rating (1-5) based on the user's fitness level
            5. A focus area for the workout (e.g., Strength, Endurance, Flexibility)

            Please format the response as a JSON object with the following structure:
            {
              "workouts": [
                {
                  "name": "Workout Name",
                  "difficulty": 3,
                  "focus": "Strength", // Include focus here
                  "exercises": [
                    {
                      "name": "Exercise Name",
                      "sets": 3,
                      "reps": "10-12",
                      "rest": "60 seconds",
                      "text": "Additional details about the exercise"
                    }
                  ]
                }
              ]
            }`;

          console.log("Sending prompt to AGiXT:", prompt);
          const response = await this.chat(this.agentName, prompt, conversationName);
          console.log("Received response from AGiXT:", response);

          const newWorkouts = this.extractJson(response).workouts;

          newWorkouts.forEach((workout: any) => {
            if (!workoutNames.has(workout.name)) {
              workoutNames.add(workout.name);
              generatedWorkouts.push(workout);
            }
          });
        }

        const workoutPlans: WorkoutPlanResponse[] = generatedWorkouts.map((workout, index) => ({
          conversationName: `${conversationName}_${index}`,
          workoutPlan: {
            weeklyPlan: [{
              day: workout.name,
              focus: workout.focus || 'General', // Provide a default if focus is missing
              exercises: workout.exercises
            }],
            nutritionAdvice: "Personalized nutrition advice will be generated separately."
          },
          completed: false,
          difficulty: workout.difficulty
        }));

        await this.newConversationMessage('assistant', JSON.stringify(workoutPlans, null, 2), conversationName);

        return workoutPlans;
      } catch (error) {
        console.error('Error generating multiple workouts:', error);
        throw error;
      }
    }
  }

  public async getChallenges(userProfile: UserProfile): Promise<Challenge[]> {
    if (this.isDemoMode) {
      return [
        {
          id: 1,
          name: 'Demo Challenge 1',
          description: 'Complete 3 workouts this week.',
          duration: '1 week',
          difficulty: 'Easy',
          completed: false,
        },
        {
          id: 2,
          name: 'Demo Challenge 2',
          description: 'Run 5 miles.',
          duration: '1 week',
          difficulty: 'Medium',
          completed: false,
        },
        // Add more demo challenges as needed
      ];
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `Challenges_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Generate a series of fitness challenges for a ${userProfile.gender} aged ${userProfile.age}, 
          with a fitness goal of ${userProfile.goal}. Each challenge should have an id, name, description, duration, 
          difficulty level, and a completion status. 
          
          Please format the response as a JSON object with the following structure:
          {
            "challenges": [
              {
                "id": 1,
                "name": "Challenge Name",
                "description": "Detailed description of the challenge",
                "duration": "Duration of the challenge",
                "difficulty": "Difficulty level",
                "completed": false
              }
            ]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const challenges = this.extractJson(response).challenges;

        await this.newConversationMessage('assistant', JSON.stringify({ challenges }, null, 2), conversationName);

        return challenges;
      } catch (error) {
        console.error('Error generating challenges:', error);
        throw error;
      }
    }
  }

  public async analyzeFeedback(feedback: string): Promise<FeedbackAnalysis> {
    if (this.isDemoMode) {
      return {
        sentiment: 'positive',
        commonIssues: [],
      };
    } else {
      await this.initializeWorkoutAgent();
      const conversationName = `FeedbackAnalysis_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Analyze the following user feedback and provide sentiment analysis and identify common issues:
          User Feedback: "${feedback}"
          
          Please format the response as a JSON object with the following structure:
          {
            "sentiment": "positive/negative/neutral",
            "commonIssues": ["issue1", "issue2", "issue3"]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        return this.extractJson(response);
      } catch (error) {
        console.error('Error analyzing feedback:', error);
        throw error;
      }
    }
  }

  public async getAdaptiveWorkout(userProfile: UserProfile, previousPerformance: WorkoutFeedback[]): Promise<AdaptiveWorkoutPlan> {
    if (this.isDemoMode) {
      return {
        weeklyPlan: [
          {
            day: 'Demo Adaptive Workout',
            focus: 'Strength', // Add focus here
            exercises: [
              { name: 'Push-ups', sets: 3, reps: '10-12', rest: '60 seconds' },
              { name: 'Squats', sets: 3, reps: '12-15', rest: '60 seconds' },
            ],
          },
        ],
        nutritionAdvice: 'Demo Nutrition Advice: Stay hydrated and eat a balanced diet.',
        adaptationLevel: 0.8,
        recommendedDifficulty: 2.7,
      };
    } else {
      await this.initializeWorkoutAgent();
      const conversationName = `AdaptiveWorkout_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const averageDifficulty = previousPerformance.reduce((sum, feedback) => {
          return sum + (feedback.difficulty === 'easy' ? 1 : feedback.difficulty === 'just right' ? 2 : 3);
        }, 0) / previousPerformance.length;

        const prompt = `Create an adaptive workout plan for a ${userProfile.gender} aged ${userProfile.age}, 
          with a fitness goal of ${userProfile.goal} and fitness level ${userProfile.fitnessLevel}. 
          The average difficulty of previous workouts was ${averageDifficulty.toFixed(2)} (1=easy, 2=just right, 3=hard).
          Adjust the workout difficulty and complexity based on this information.
          
          Please format the response as a JSON object with the following structure:
          {
            "weeklyPlan": [
              {
                "day": "Day 1",
                "focus": "Strength", // Ensure AGiXT includes focus
                "exercises": [
                  {
                    "name": "Exercise Name",
                    "sets": 3,
                    "reps": "10-12",
                    "rest": "60 seconds",
                    "text": "Additional details about the exercise"
                  }
                ]
              }
                ],
            "nutritionAdvice": "Detailed nutrition advice here",
            "adaptationLevel": 0.75,
            "recommendedDifficulty": 2.5
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const adaptiveWorkoutPlan = this.extractJson(response);
        adaptiveWorkoutPlan.weeklyPlan.forEach((dayPlan: DayPlan) => {
          dayPlan.focus = dayPlan.focus || 'General'; 
        });
        return adaptiveWorkoutPlan;
      } catch (error) {
        console.error('Error generating adaptive workout:', error);
        throw error;
      }
    }
  }

  public async detectAnomalies(userMetrics: number[]): Promise<AnomalyDetectionResult> {
    if (this.isDemoMode) {
      return {
        isAnomaly: false,
        details: 'No anomalies detected in demo mode.',
      };
    } else {
      await this.initializeWorkoutAgent();
      const conversationName = `AnomalyDetection_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Analyze the following user metrics for anomalies: ${userMetrics.join(', ')}
          
          Please format the response as a JSON object with the following structure:
          {
            "isAnomaly": true/false,
            "details": "Explanation of any detected anomalies"
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        return this.extractJson(response);
      } catch (error) {
        console.error('Error detecting anomalies:', error);
        throw error;
      }
    }
  }

  public async getPersonalizedRecommendations(userProfile: UserProfile, workoutHistory: WorkoutFeedback[], preferences: WorkoutPreferences): Promise<PersonalizedRecommendation> {
    if (this.isDemoMode) {
      return {
        workoutPlan: {
          weeklyPlan: [
            {
              day: 'Demo Personalized Workout',
              focus: 'Strength',
              exercises: [
                { name: 'Bench Press', sets: 3, reps: '8-12', rest: '60 seconds' },
                { name: 'Squats', sets: 3, reps: '10-15', rest: '60 seconds' },
              ],
            },
          ],
          nutritionAdvice: 'Demo Nutrition Advice: Focus on protein intake and hydration.',
        },
        focusAreas: ['Strength', 'Endurance'],
        recommendedExercises: ['Deadlifts', 'Pull-ups'],
        nutritionTips: ['Eat a balanced diet.', 'Get enough sleep.'],
      };
    } else {
      await this.initializeWorkoutAgent();
      const conversationName = `PersonalizedRecommendations_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Generate personalized workout and nutrition recommendations for a ${userProfile.gender} aged ${userProfile.age}, 
          with a fitness goal of ${userProfile.goal} and fitness level ${userProfile.fitnessLevel}.
          User preferences: ${JSON.stringify(preferences)}
          Workout history: ${JSON.stringify(workoutHistory)}
          
          Please format the response as a JSON object with the following structure:
          {
            "workoutPlan": {
              "weeklyPlan": [
                {
                  "day": "Day 1",
                  "focus": "Strength", // Ensure AGiXT includes focus
                  "exercises": [
                    {
                      "name": "Exercise Name",
                      "sets": 3,
                      "reps": "10-12",
                      "rest": "60 seconds",
                      "text": "Additional details about the exercise"
                    }
                  ]
                }
              ],
              "nutritionAdvice": "Detailed nutrition advice here"
            },
            "focusAreas": ["Strength", "Flexibility"],
            "recommendedExercises": ["Recommended Exercise 1", "Recommended Exercise 2"],
            "nutritionTips": [
              "Increase protein intake",
              "Add more leafy greens to your diet"
            ]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        return this.extractJson(response);
      } catch (error) {
        console.error('Error generating personalized recommendations:', error);
        throw error;
      }
    }
  }

  public async getFitnessForecast(userProfile: UserProfile, historicalData: number[][]): Promise<FitnessForecast[]> {
    if (this.isDemoMode) {
      return [
        {
          date: '2024-01-01',
          predictedMetrics: {
            weight: 175,
            bodyFat: 18,
            muscleGain: 0.5,
          },
        },
        // Add more demo forecast data as needed
      ];
    } else {
      await this.initializeWorkoutAgent();
      const conversationName = `FitnessForecast_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Generate a fitness forecast for the next 4 weeks based on the following historical data: 
          ${JSON.stringify(historicalData)}. Consider the user's goal of ${userProfile.goal}.
          
          Please format the response as a JSON object with the following structure:
          {
            "forecast": [
              {
                "date": "YYYY-MM-DD",
                "predictedMetrics": {
                  "weight": 70.5,
                  "bodyFat": 15.2,
                  "muscleGain": 0.3
                }
              }
            ]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        return this.extractJson(response).forecast;
      } catch (error) {
        console.error('Error generating fitness forecast:', error);
        throw error;
      }
    }
  }

  public async getSupplements(userProfile: UserProfile): Promise<Supplement[]> {
    if (this.isDemoMode) {
      return [
        {
          id: 1,
          name: 'Demo Supplement 1',
          dosage: '1 capsule daily',
          benefit: 'Improved muscle recovery',
        },
        // Add more demo supplements as needed
      ];
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `Supplements_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Recommend dietary supplements for a ${userProfile.gender} aged ${userProfile.age}, 
          with a fitness goal of ${userProfile.goal}. Each supplement should have an id, name, dosage, and benefit. 
          
          Please format the response as a JSON object with the following structure:
          {
            "supplements": [
              {
                "id": 1,
                "name": "Supplement Name",
                "dosage": "Dosage information",
                "benefit": "Health benefit of the supplement"
              }
            ]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const supplements = this.extractJson(response).supplements;

        await this.newConversationMessage('assistant', JSON.stringify({ supplements }, null, 2), conversationName);

        return supplements;
      } catch (error) {
        console.error('Error recommending supplements:', error);
        throw error;
      }
    }
  }

  public async getMealPlan(userProfile: UserProfile): Promise<MealPlan> {
    if (this.isDemoMode) {
      return {
        breakfast: 'Demo Breakfast: Oatmeal with berries and nuts',
        lunch: 'Demo Lunch: Chicken salad sandwich on whole-wheat bread',
        dinner: 'Demo Dinner: Salmon with roasted vegetables',
        snacks: ['Demo Snack 1: Greek yogurt with fruit', 'Demo Snack 2: Almonds'],
      };
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `MealPlan_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Generate a detailed meal plan for a ${userProfile.gender} aged ${userProfile.age}, height ${userProfile.feet}'${userProfile.inches}", 
          weight ${userProfile.weight} lbs, with a fitness goal of ${userProfile.goal}. 
          
          Please format the response as a JSON object with the following structure:
          {
            "breakfast": "Detailed breakfast plan",
            "lunch": "Detailed lunch plan",
            "dinner": "Detailed dinner plan",
            "snacks": ["Snack 1", "Snack 2", "Snack 3"]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const mealPlan = this.extractJson(response);

        await this.newConversationMessage('assistant', JSON.stringify(mealPlan, null, 2), conversationName);

        return mealPlan;
      } catch (error) {
        console.error('Error generating meal plan:', error);
        throw error;
      }
    }
  }

  public async addCustomExercise(userProfile: UserProfile, exercise: { name: string; description: string }): Promise<CustomExercise[]> {
    if (this.isDemoMode) {
      return [
        {
          id: 1,
          name: 'Demo Custom Exercise',
          description: 'This is a demo custom exercise.',
        },
      ];
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `CustomExercise_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Add a custom exercise for a ${userProfile.gender} aged ${userProfile.age}, 
          with a fitness goal of ${userProfile.goal}. The exercise name is "${exercise.name}" and the description is "${exercise.description}". 
          Please generate a list of custom exercises including this new one and any previously added exercises.
          
          Please format the response as a JSON object with the following structure:
          {
            "customExercises": [
              {
                "id": 1,
                "name": "Exercise Name",
                "description": "Detailed description of the exercise"
              }
            ]
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const customExercises = this.extractJson(response).customExercises;

        await this.newConversationMessage('assistant', JSON.stringify(customExercises, null, 2), conversationName);

        return customExercises;
      } catch (error) {
        console.error('Error adding custom exercise:', error);
        throw error;
      }
    }
  }

  public async logWorkoutCompletion(userProfile: UserProfile, workoutPlan: WorkoutPlan, feedback: WorkoutFeedback): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo Workout Completion Logged:', { userProfile, workoutPlan, feedback });
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `WorkoutCompletion_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Log the completion of a workout for a ${userProfile.gender} aged ${userProfile.age}, 
          with a fitness goal of ${userProfile.goal}. The workout plan was: ${JSON.stringify(workoutPlan)}. 
          The user's feedback is: ${JSON.stringify(feedback)}. 
          Please provide a brief analysis of the workout completion and any recommendations for future workouts.
          
          Please format the response as a JSON object with the following structure:
          {
            "analysis": "Brief analysis of the workout completion",
            "recommendations": "Recommendations for future workouts"
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const completionAnalysis = this.extractJson(response);

        await this.newConversationMessage('assistant', JSON.stringify(completionAnalysis, null, 2), conversationName);

        console.log("Workout completion logged and analyzed:", completionAnalysis);
      } catch (error) {
        console.error('Error logging workout completion:', error);
        throw error;
      }
    }
  }

  public async getMotivationalQuote(): Promise<string> {
    if (this.isDemoMode) {
      return 'Demo Quote: "The only bad workout is the one that didn\'t happen."';
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `MotivationalQuote_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Provide a motivational quote for fitness enthusiasts. 
          
          Please format the response as a JSON object with the following structure:
          {
            "quote": "Motivational quote here"
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const quoteResponse = this.extractJson(response);

        await this.newConversationMessage('assistant', JSON.stringify(quoteResponse, null, 2), conversationName);

        return quoteResponse.quote;
      } catch (error) {
        console.error('Error getting motivational quote:', error);
        throw error;
      }
    }
  }

  public async getProgressReport(userProfile: UserProfile, workoutHistory: WorkoutFeedback[], measurementHistory: BodyMeasurements[]): Promise<ProgressReport> {
    if (this.isDemoMode) {
      return {
        summary: 'Demo Report: You\'re making great progress! Keep up the good work.',
        workoutProgress: {
          totalWorkouts: 10,
          averageDifficulty: 2.5,
          mostImprovedExercises: ['Push-ups', 'Squats'],
        },
        bodyCompositionChanges: {
          weightChange: -5,
          bodyFatPercentageChange: -2,
        },
        recommendations: ['Stay consistent with your workouts.', 'Focus on proper form.'],
      };
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `ProgressReport_${userProfile.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Generate a comprehensive progress report for ${userProfile.name}. 
          Consider their fitness goal of ${userProfile.goal} and current fitness level of ${userProfile.fitnessLevel}.
          Workout history: ${JSON.stringify(workoutHistory)}
          Measurement history: ${JSON.stringify(measurementHistory)}
          
          Please format the response as a JSON object with the following structure:
          {
            "progressReport": {
              "summary": "Overall progress summary",
              "workoutProgress": {
                "totalWorkouts": 25,
                "averageDifficulty": 2.3,
                "mostImprovedExercises": ["Squats", "Push-ups"]
              },
              "bodyCompositionChanges": {
                "weightChange": -2.5,
                "bodyFatPercentageChange": -1.2
              },
              "recommendations": [
                "Increase cardio frequency",
                "Focus on progressive overload for bench press"
              ]
            }
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const progressReportResponse = this.extractJson(response);

        await this.newConversationMessage('assistant', JSON.stringify(progressReportResponse, null, 2), conversationName);

        return progressReportResponse.progressReport;
      } catch (error) {
        console.error('Error getting progress report:', error);
        throw error;
      }
    }
  }

  public async createSocialChallenge(creator: UserProfile, challengeDetails: Partial<SocialChallenge>): Promise<SocialChallenge> {
    if (this.isDemoMode) {
      return {
        id: 'demo-challenge-id',
        creatorId: creator.name,
        participantIds: [creator.name],
        challengeName: 'Demo Social Challenge',
        description: 'This is a demo social challenge.',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        goal: 10000,
        unit: 'steps',
      };
    } else {
      await this.initializeWorkoutAgent();

      const conversationName = `CreateSocialChallenge_${creator.name}_${Date.now()}`;

      try {
        await this.newConversation(this.agentName, conversationName);

        const prompt = `Create a social fitness challenge based on the following details:
          Creator: ${creator.name}
          Challenge Name: ${challengeDetails.challengeName || 'Not specified'}
          Description: ${challengeDetails.description || 'Not specified'}
          Start Date: ${challengeDetails.startDate || 'Not specified'}
          End Date: ${challengeDetails.endDate || 'Not specified'}
          Goal: ${challengeDetails.goal || 'Not specified'}
          Unit: ${challengeDetails.unit || 'Not specified'}

          Please format the response as a JSON object with the following structure:
          {
            "id": "unique_challenge_id",
            "creatorId": "${creator.name}",
            "participantIds": ["${creator.name}"],
            "challengeName": "Challenge Name",
            "description": "Detailed challenge description",
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD",
            "goal": 100,
            "unit": "miles"
          }`;

        const response = await this.chat(this.agentName, prompt, conversationName);
        const socialChallenge = this.extractJson(response);

        await this.newConversationMessage('assistant', JSON.stringify(socialChallenge, null, 2), conversationName);

        return socialChallenge;
      } catch (error) {
        console.error('Error creating social challenge:', error);
        throw error;
      }
    }
  }

  public async joinSocialChallenge(user: UserProfile, challengeId: string): Promise<SocialChallenge> {
    if (this.isDemoMode) {
      return {
        id: challengeId,
        creatorId: 'Demo Creator',
        participantIds: ['Demo Creator', user.name],
        challengeName: 'Demo Social Challenge',
        description: 'This is a demo social challenge.',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        goal: 10000,
        unit: 'steps',
      };
    } else {
      // This method would typically interact with a database to update the challenge
      // For this example, we'll simulate the process
      console.log(`User ${user.name} joined challenge ${challengeId}`);
      return {
        id: challengeId,
        creatorId: 'creator123',
        participantIds: ['creator123', user.name],
        challengeName: 'Sample Challenge',
        description: 'This is a sample challenge',
        startDate: '2023-08-01',
        endDate: '2023-08-31',
        goal: 100,
        unit: 'miles'
      };
    }
  }

  public async getSocialChallengeLeaderboard(challengeId: string): Promise<{userId: string, progress: number}[]> {
    // This method would typically fetch data from a database
    // For this example, we'll return mock data
    return [
      { userId: 'user1', progress: 75 },
      { userId: 'user2', progress: 60 },
      { userId: 'user3', progress: 90 },
    ];
  }


  public async analyzeWorkouts(workouts: ActivitySummaryRecord[]): Promise<WorkoutAnalysis> {
    if (this.isDemoMode) {
      return {
        recommendation: "Since you've been focusing on cardio lately, try incorporating some strength training exercises like squats and push-ups into your next workout.",
        warning: false
      };
    } else {
      // 1. Prepare the workout data for AGiXT
      const workoutDataForAgixt = workouts.map(workout => ({
        activityType: workout.activityType,
        duration: workout.duration,
        // ... other relevant fields from ActivitySummaryRecord
      }));

      // 2. Construct the prompt with clear JSON formatting instructions
      const prompt = `Analyze these workouts and provide a recommendation for the user's next workout.
      Workout Data: ${JSON.stringify(workoutDataForAgixt)}

      Please format your response strictly as a JSON object with the following structure:
      \`\`\`json
      {
        "recommendation": "Recommendation text for the next workout",
        "warning": true/false // true if it's a cautionary recommendation
      }
      \`\`\`
      `;

      try {
        // 3. Call your AGiXT API (using your existing chat function)
        const response = await this.chat(this.agentName, prompt, "WorkoutAnalysis");

        // 4. Parse the response (make sure extractJson is defined in your class)
        const analysis: WorkoutAnalysis = this.extractJson(response);
        return analysis;

      } catch (error) {
        console.error('Error analyzing workouts with AGiXT:', error);
        throw error; // Re-throw the error for handling in the background task 
      }
    }
  }
}

export default AGiXTService;