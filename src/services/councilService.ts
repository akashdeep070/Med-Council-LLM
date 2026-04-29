import { Groq } from 'groq-sdk';
import { retrieveMedicalContext } from './ragService';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });

export enum AgentRole {
  DIAGNOSTICIAN = "Diagnosis Expert",
  RISK_EVALUATOR = "Risk Evaluator",
  TREATMENT_PLANNER = "Treatment Planner",
  EVIDENCE_REVIEWER = "Evidence Reviewer",
  CHAIRMAN = "Chairman"
}

export interface AgentInfo {
  role: AgentRole;
  name: string;
  specialty: string;
  avatar: string;
}

export const AGENTS: Record<AgentRole, AgentInfo> = {
  [AgentRole.DIAGNOSTICIAN]: {
    role: AgentRole.DIAGNOSTICIAN,
    name: "Dr. Diagnostic",
    specialty: "Clinical Diagnosis & Pathology",
    avatar: "🔬"
  },
  [AgentRole.RISK_EVALUATOR]: {
    role: AgentRole.RISK_EVALUATOR,
    name: "Dr. Risk",
    specialty: "Risk Assessment & Complications",
    avatar: "⚠️"
  },
  [AgentRole.TREATMENT_PLANNER]: {
    role: AgentRole.TREATMENT_PLANNER,
    name: "Dr. Treatment",
    specialty: "Therapeutics & Interventions",
    avatar: "💊"
  },
  [AgentRole.EVIDENCE_REVIEWER]: {
    role: AgentRole.EVIDENCE_REVIEWER,
    name: "Dr. Evidence",
    specialty: "Literature & Guideline Review",
    avatar: "📚"
  },
  [AgentRole.CHAIRMAN]: {
    role: AgentRole.CHAIRMAN,
    name: "The Chairman",
    specialty: "Clinical Synthesis & Action",
    avatar: "⚖️"
  }
};

export interface DiscussionPoint {
  id: string;
  agentRole: AgentRole;
  summary: string;
  content: string;
  timestamp: number;
  thinking?: string;
  metrics?: {
    confidence: number;
    urgency: number;
    evidenceStrength: number;
  };
}

export async function getAgentResponse(
  role: AgentRole,
  topic: string,
  history: DiscussionPoint[],
  onProgress?: (chunk: string) => void
) {
  const agent = AGENTS[role];
  const historyText = history
    .map(p => `[${p.agentRole}] ${p.summary}`)
    .join("\n\n");

  const medicalContext = await retrieveMedicalContext(topic);

  const systemInstruction = `You are ${agent.name}, acting as the ${agent.role} within a medical council.
  Topic: "${topic}"
  
  Relevant Medical Knowledge (RAG):
  ${medicalContext}

  Current Discussion History:
  ${historyText}

  Rules:
  1. Focus strictly on your functional role (${agent.role}).
  2. Be concise but deep in reasoning.
  3. Provide your response in JSON format.
  4. Include "thinking" for internal reasoning.
  5. Include "summary" (1-2 sentences) of your main point for quick scanning.
  6. Include "content" with your full detailed reasoning.
  7. Include "metrics" with numerical scores (0-100) for confidence, urgency, and evidenceStrength.
  
  Format your response as a valid JSON object with the exact keys: "thinking", "summary", "content", and "metrics" (which includes "confidence", "urgency", and "evidenceStrength").`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: "Please provide your perspective on the matter." }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      stream: true
    });

    let content = "";
    for await (const chunk of chatCompletion) {
      const textChunk = chunk.choices[0]?.delta?.content || "";
      content += textChunk;
      if (textChunk && onProgress) {
        onProgress(textChunk);
      }
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error fetching response for ${role}:`, error);
    throw error;
  }
}

export async function getChairmanSynthesis(
  topic: string,
  history: DiscussionPoint[],
  onProgress?: (chunk: string) => void
) {
  const agent = AGENTS[AgentRole.CHAIRMAN];
  const historyText = history
    .map(p => `[${p.agentRole}] ${p.content}`)
    .join("\n\n");

  const medicalContext = await retrieveMedicalContext(topic);

  const systemInstruction = `You are ${agent.name}, the ${agent.role} of the council.
  Your task is to synthesize the specialist discussion into a final decision and action plan.
  
  Topic: "${topic}"

  Relevant Medical Knowledge (RAG):
  ${medicalContext}
  
  Discussion:
  ${historyText}

  Rules:
  1. Identify the final diagnosis/decision.
  2. Explicitly map out any disagreements or conflicts between agents. If none, pass an empty array.
  3. Output critical safety alerts (e.g. contraindications, missed checks).
  4. Provide the output in JSON format.
  
  Format your response as a valid JSON object with these exact keys: "decision" (string), "confidence" (number), "riskLevel" (string), "agreementFraction" (string), "synthesis" (string), "actionPlan" (array of strings), "conflicts" (array of objects with "parties" and "issue"), "safetyAlerts" (array of strings), and "clinicalMetrics" (object with "agreementScore", "uncertainty", "evidenceStrength", and "riskFlag" boolean).`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: "Summarize and stabilize the council's decision." }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      stream: true,
    });

    let content = "";
    for await (const chunk of chatCompletion) {
      const textChunk = chunk.choices[0]?.delta?.content || "";
      content += textChunk;
      if (textChunk && onProgress) {
        onProgress(textChunk);
      }
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error fetching chairman synthesis:", error);
    throw error;
  }
}
