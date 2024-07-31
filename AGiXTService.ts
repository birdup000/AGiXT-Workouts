import axios from 'axios';

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

class AGiXTService {
  private baseUri: string;
  private headers: { [key: string]: string };
  private agentName: string = 'WorkoutAgent';

  constructor() {
    this.baseUri = '';
    this.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
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

  async getAgents(): Promise<any> {
    return this.request('get', '/api/agent');
  }

  async addAgent(agentName: string, settings: any = {}): Promise<any> {
    return this.request('post', '/api/agent', { agent_name: agentName, settings });
  }

  async newConversation(agentName: string, conversationName: string, conversationContent: any[] = []): Promise<any> {
    return this.request('post', '/api/conversation', {
      conversation_name: conversationName,
      agent_name: agentName,
      conversation_content: conversationContent,
    });
  }

  async chat(agentName: string, userInput: string, conversationName: string, contextResults = 4): Promise<any> {
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

  async newConversationMessage(role: string, message: string, conversationName: string): Promise<any> {
    return this.request('post', '/api/conversation/message', {
      role,
      message,
      conversation_name: conversationName,
    });
  }

  async initializeWorkoutAgent(): Promise<void> {
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

  private extractJson(response: any): any {
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

  private extractWorkoutPlan(response: any): WorkoutPlan {
    const jsonResponse = this.extractJson(response);

    const workoutPlan: WorkoutPlan = {
      weeklyPlan: jsonResponse.weeklyPlan.map((day: any) => ({
        day: day.day,
        exercises: day.exercises.map((exercise: any) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          text: exercise.text,
        })),
      })),
      nutritionAdvice: jsonResponse.nutritionAdvice,
    };

    return workoutPlan;
  }

  private extractChallenges(response: any): Challenge[] {
    const jsonResponse = this.extractJson(response);

    const challenges: Challenge[] = jsonResponse.challenges.map((challenge: any) => ({
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      duration: challenge.duration,
      difficulty: challenge.difficulty,
      completed: challenge.completed,
    }));

    return challenges;
  }

  private extractSupplements(response: any): Supplement[] {
    const jsonResponse = this.extractJson(response);

    const supplements: Supplement[] = jsonResponse.supplements.map((supplement: any) => ({
      id: supplement.id,
      name: supplement.name,
      dosage: supplement.dosage,
      benefit: supplement.benefit,
    }));

    return supplements;
  }

  private extractMealPlan(response: any): MealPlan {
    const jsonResponse = this.extractJson(response);

    const mealPlan: MealPlan = {
      breakfast: jsonResponse.breakfast,
      lunch: jsonResponse.lunch,
      dinner: jsonResponse.dinner,
      snacks: jsonResponse.snacks,
    };

    return mealPlan;
  }

  private extractCustomExercises(response: any): CustomExercise[] {
    const jsonResponse = this.extractJson(response);

    const customExercises: CustomExercise[] = jsonResponse.customExercises.map((exercise: any) => ({
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
    }));

    return customExercises;
  }

  private extractWorkoutAdjustment(response: any): WorkoutPlan {
    const jsonResponse = this.extractJson(response);

    const workoutPlan: WorkoutPlan = {
      weeklyPlan: jsonResponse.weeklyPlan.map((day: any) => ({
        day: day.day,
        exercises: day.exercises.map((exercise: any) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          text: exercise.text,
        })),
      })),
      nutritionAdvice: jsonResponse.nutritionAdvice,
    };

    return workoutPlan;
  }

  private extractFeedbackAnalysis(response: any): any {
    const jsonResponse = this.extractJson(response);

    return jsonResponse.analysis;
  }

  private extractMotivationalQuote(response: any): string {
    const jsonResponse = this.extractJson(response);

    return jsonResponse.quote;
  }

  private extractProgressReport(response: any): string {
    const jsonResponse = this.extractJson(response);

    return jsonResponse.progressReport;
  }

  private extractWorkoutModification(response: any): WorkoutPlan {
    const jsonResponse = this.extractJson(response);

    const workoutPlan: WorkoutPlan = {
      weeklyPlan: jsonResponse.weeklyPlan.map((day: any) => ({
        day: day.day,
        exercises: day.exercises.map((exercise: any) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          rest: exercise.rest,
          text: exercise.text,
        })),
      })),
      nutritionAdvice: jsonResponse.nutritionAdvice,
    };

    return workoutPlan;
  }

  private extractWarmupRoutine(response: any): string {
    const jsonResponse = this.extractJson(response);

    return jsonResponse.warmupRoutine;
  }

  private extractRecoveryTips(response: any): string {
    const jsonResponse = this.extractJson(response);

    return jsonResponse.recoveryTips;
  }

  async createWorkoutPlan(userProfile: UserProfile, workoutPath: string): Promise<WorkoutPlanResponse> {
    await this.initializeWorkoutAgent();

    const conversationName = `Workout_${userProfile.name}_${Date.now()}`;

    try {
      await this.newConversation(this.agentName, conversationName);

      const prompt = `Create a comprehensive workout plan for a ${userProfile.gender} aged ${userProfile.age}, 
        height ${userProfile.feet}'${userProfile.inches}", weight ${userProfile.weight} lbs, with a fitness goal of ${userProfile.goal} 
        and workout path of ${workoutPath}. Their current fitness level is ${userProfile.fitnessLevel} and they can train ${userProfile.daysPerWeek} days per week. 
        Include specific exercises, sets, reps, and rest periods for each day. Also, provide nutrition advice tailored to their goal.
        
        Please format the response as a JSON object with the following structure:
        {
          "weeklyPlan": [
            {
              "day": "Day 1",
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
        }`;

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const workoutPlan = this.extractWorkoutPlan(response);

      await this.newConversationMessage('assistant', JSON.stringify(workoutPlan, null, 2), conversationName);

      return {
        conversationName,
        workoutPlan,
        completed: false
      };
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw error;
    }
  }

  async getChallenges(userProfile: UserProfile): Promise<Challenge[]> {
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

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const challenges = this.extractChallenges(response);

      await this.newConversationMessage('assistant', JSON.stringify(challenges, null, 2), conversationName);

      return challenges;
    } catch (error) {
      console.error('Error generating challenges:', error);
      throw error;
    }
  }

  async getSupplements(userProfile: UserProfile): Promise<Supplement[]> {
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

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const supplements = this.extractSupplements(response);

      await this.newConversationMessage('assistant', JSON.stringify(supplements, null, 2), conversationName);

      return supplements;
    } catch (error) {
      console.error('Error recommending supplements:', error);
      throw error;
    }
  }

  async getMealPlan(userProfile: UserProfile): Promise<MealPlan> {
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
          "snacks": ["List of snacks"]
        }`;

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const mealPlan = this.extractMealPlan(response);

      await this.newConversationMessage('assistant', JSON.stringify(mealPlan, null, 2), conversationName);

      return mealPlan;
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw error;
    }
  }

  async addCustomExercise(userProfile: UserProfile, exercise: { name: string; description: string }): Promise<CustomExercise[]> {
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

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const customExercises = this.extractCustomExercises(response);

      await this.newConversationMessage('assistant', JSON.stringify(customExercises, null, 2), conversationName);

      return customExercises;
    } catch (error) {
      console.error('Error adding custom exercise:', error);
      throw error;
    }
  }

  async adjustWorkoutPlan(userProfile: UserProfile, feedback: WorkoutFeedback): Promise<WorkoutPlan> {
    await this.initializeWorkoutAgent();

    const conversationName = `AdjustWorkout_${userProfile.name}_${Date.now()}`;

    try {
      await this.newConversation(this.agentName, conversationName);

      const prompt = `Adjust the workout plan for a ${userProfile.gender} aged ${userProfile.age}, height ${userProfile.feet}'${userProfile.inches}", 
        weight ${userProfile.weight} lbs, with a fitness goal of ${userProfile.goal}. Consider the following feedback: ${JSON.stringify(feedback)}. 
        
        Please format the response as a JSON object with the following structure:
        {
          "weeklyPlan": [
            {
              "day": "Day 1",
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
        }`;

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const workoutPlan = this.extractWorkoutAdjustment(response);

      await this.newConversationMessage('assistant', JSON.stringify(workoutPlan, null, 2), conversationName);

      return workoutPlan;
    } catch (error) {
      console.error('Error adjusting workout plan:', error);
      throw error;
    }
  }

  async logWorkoutCompletion(userProfile: UserProfile, workoutPlan: WorkoutPlan, feedback: WorkoutFeedback): Promise<void> {
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

      console.log("Sending prompt to AGiXT:", prompt);
      const response = await this.chat(this.agentName, prompt, conversationName);
      console.log("Received response from AGiXT:", response);

      const completionAnalysis = this.extractJson(response);

      await this.newConversationMessage('assistant', JSON.stringify(completionAnalysis, null, 2), conversationName);

      // You might want to store this analysis or use it to update the user's profile
      console.log("Workout completion logged and analyzed:", completionAnalysis);
    } catch (error) {
      console.error('Error logging workout completion:', error);
      throw error;
    }
  }

// Add these methods to the AGiXTService class

async getMotivationalQuote(): Promise<string> {
  await this.initializeWorkoutAgent();

  const conversationName = `MotivationalQuote_${Date.now()}`;

  try {
    await this.newConversation(this.agentName, conversationName);

    const prompt = `Provide a motivational quote for fitness enthusiasts. 
      
      Please format the response as a JSON object with the following structure:
      {
        "quote": "Motivational quote here"
      }`;

    console.log("Sending prompt to AGiXT:", prompt);
    const response = await this.chat(this.agentName, prompt, conversationName);
    console.log("Received response from AGiXT:", response);

    const quote = this.extractMotivationalQuote(response);

    await this.newConversationMessage('assistant', JSON.stringify({ quote }, null, 2), conversationName);

    return quote;
  } catch (error) {
    console.error('Error getting motivational quote:', error);
    throw error;
  }
}

async getProgressReport(userProfile: UserProfile): Promise<string> {
  await this.initializeWorkoutAgent();

  const conversationName = `ProgressReport_${userProfile.name}_${Date.now()}`;

  try {
    await this.newConversation(this.agentName, conversationName);

    const prompt = `Generate a progress report for ${userProfile.name}. 
      Consider their fitness goal of ${userProfile.goal} and current fitness level of ${userProfile.fitnessLevel}.
      
      Please format the response as a JSON object with the following structure:
      {
        "progressReport": "Detailed progress report here"
      }`;

    console.log("Sending prompt to AGiXT:", prompt);
    const response = await this.chat(this.agentName, prompt, conversationName);
    console.log("Received response from AGiXT:", response);

    const progressReport = this.extractProgressReport(response);

    await this.newConversationMessage('assistant', JSON.stringify({ progressReport }, null, 2), conversationName);

    return progressReport;
  } catch (error) {
    console.error('Error getting progress report:', error);
    throw error;
  }
}
}

export default AGiXTService;