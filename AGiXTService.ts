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
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  completed: boolean;
}

export interface Supplement {
  id: number;
  name: string;
  dosage: string;
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

class AGiXTService {
  private baseUri: string;
  private headers: { [key: string]: string };
  private agentName: string = 'WorkoutAgent';

  constructor() {
    this.baseUri = 'http://localhost:7437';
    this.headers = {
      'Authorization': 'Bearer your-api-key-here',
      'Content-Type': 'application/json',
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

  private extractWorkoutPlan(response: any): WorkoutPlan {
    console.log("Extracting workout plan from response:", response);

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
              throw new Error("Failed to extract valid workout plan from response");
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

    if (!jsonResponse || !jsonResponse.weeklyPlan || !Array.isArray(jsonResponse.weeklyPlan)) {
      console.error("Invalid weeklyPlan structure:", jsonResponse ? jsonResponse.weeklyPlan : 'undefined');
      throw new Error(`Invalid weeklyPlan: ${JSON.stringify(jsonResponse ? jsonResponse.weeklyPlan : 'undefined')}`);
    }

    const workoutPlan: WorkoutPlan = {
      weeklyPlan: jsonResponse.weeklyPlan.map((day: any) => ({
        day: day.day || "Unnamed Day",
        exercises: (day.exercises || []).map((exercise: any) => ({
          name: exercise.name || "Unnamed Exercise",
          sets: Number(exercise.sets) || 0,
          reps: exercise.reps || "0",
          rest: exercise.rest || "0 seconds",
          text: exercise.text || "No additional details provided"
        }))
      })),
      nutritionAdvice: jsonResponse.nutritionAdvice || "Nutrition advice not provided."
    };

    return workoutPlan;
  }

  async createWorkoutPlan(userProfile: UserProfile): Promise<WorkoutPlanResponse> {
    await this.initializeWorkoutAgent();

    const conversationName = `Workout_${userProfile.name}_${Date.now()}`;

    try {
      await this.newConversation(this.agentName, conversationName);

      const prompt = `Create a comprehensive workout plan for a ${userProfile.gender} aged ${userProfile.age}, 
        height ${userProfile.feet}'${userProfile.inches}", weight ${userProfile.weight} lbs, with a fitness goal of ${userProfile.goal}. 
        Their current fitness level is ${userProfile.fitnessLevel} and they can train ${userProfile.daysPerWeek} days per week. 
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
        workoutPlan
      };
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw error;
    }
  }

  async getWorkoutConversation(conversationName: string): Promise<WorkoutPlan> {
    try {
      const conversation = await this.request('get', `/api/conversation/${conversationName}`);
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        return JSON.parse(lastMessage.content);
      }
      throw new Error('No valid workout plan found in the conversation');
    } catch (error) {
      console.error('Error fetching workout conversation:', error);
      throw error;
    }
  }

  async generateWorkoutSummary(workoutPlan: WorkoutPlan): Promise<string> {
    const summary = workoutPlan.weeklyPlan.map(day => {
      const exercises = day.exercises.map(ex => `${ex.name}: ${ex.sets} sets of ${ex.reps} reps (Rest: ${ex.rest})`).join('\n');
      return `${day.day}:\n${exercises}`;
    }).join('\n\n');

    return `${summary}\n\nNutrition Advice:\n${workoutPlan.nutritionAdvice}`;
  }

  async getChallenges(userProfile: UserProfile): Promise<Challenge[]> {
    const prompt = `Generate 3 fitness challenges for a ${userProfile.gender} aged ${userProfile.age} with a fitness level of ${userProfile.fitnessLevel} and a goal of ${userProfile.goal}. Format the response as a JSON array of objects, each with 'id', 'name', 'description', and 'completed' (set to false) properties.`;
    
    const response = await this.chat(this.agentName, prompt, 'challenges');
    return this.parseJsonResponse(response);
  }

  async getSupplements(userProfile: UserProfile): Promise<Supplement[]> {
    const prompt = `Recommend 3 supplements for a ${userProfile.gender} aged ${userProfile.age} with a fitness level of ${userProfile.fitnessLevel} and a goal of ${userProfile.goal}. Format the response as a JSON array of objects, each with 'id', 'name', and 'dosage' properties.`;
    
    const response = await this.chat(this.agentName, prompt, 'supplements');
    return this.parseJsonResponse(response);
  }

  async getMealPlan(userProfile: UserProfile): Promise<MealPlan> {
    const prompt = `Create a meal plan for a ${userProfile.gender} aged ${userProfile.age}, weight ${userProfile.weight} lbs, with a fitness goal of ${userProfile.goal}. Include breakfast, lunch, dinner, and two snacks. Format the response as a JSON object with 'breakfast', 'lunch', 'dinner', and 'snacks' (array) properties.`;
    
    const response = await this.chat(this.agentName, prompt, 'mealplan');
    return this.parseJsonResponse(response);
  }

  async addCustomExercise(userProfile: UserProfile, exercise: { name: string, description: string }): Promise<CustomExercise[]> {
    const prompt = `Add a custom exercise named "${exercise.name}" with description "${exercise.description}" to the user's profile. Then, return a list of all custom exercises including this new one. Format the response as a JSON array of objects, each with 'id', 'name', and 'description' properties.`;
    
    const response = await this.chat(this.agentName, prompt, 'customexercises');
    return this.parseJsonResponse(response);
  }

  async adjustWorkoutPlan(userProfile: UserProfile, currentPlan: WorkoutPlanResponse, sorenessLevel: string): Promise<WorkoutPlanResponse> {
    const prompt = `Adjust the following workout plan based on a soreness level of ${sorenessLevel}:
    ${JSON.stringify(currentPlan.workoutPlan, null, 2)}
    
    Reduce intensity for high soreness, maintain for medium, and slightly increase for low. Format the response as a JSON object matching the original structure.`;
    
    const response = await this.chat(this.agentName, prompt, 'adjustworkout');
    const adjustedPlan = this.parseJsonResponse(response);
    return { ...currentPlan, workoutPlan: adjustedPlan };
  }

  private parseJsonResponse(response: any): any {
    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
        throw new Error("No valid JSON found in the response");
      }
    } else if (typeof response === 'object' && response !== null) {
      return response.response ? JSON.parse(response.response) : response;
    }
    throw new Error("Response is neither a string nor an object");
  }
}

export default AGiXTService;