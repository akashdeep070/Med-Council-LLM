// Minimal RAG Implementation
// In a production environment, this should be replaced with a Vector Database 
// (like Pinecone, Qdrant) and an Embeddings API (via LangChain).

const KNOWLEDGE_BASE = [
  { id: "doc1", content: "Aspirin is commonly used to reduce the risk of cardiovascular events, but carries a risk of gastrointestinal bleeding." },
  { id: "doc2", content: "First-line treatment for uncomplicated hypertension includes ACE inhibitors, ARBs, CCBs, or thiazide-like diuretics." },
  { id: "doc3", content: "Metformin is the preferred initial pharmacologic agent for the treatment of type 2 diabetes." },
  { id: "doc4", content: "Statins are recommended for patients with elevated LDL cholesterol to prevent atherosclerotic cardiovascular disease." },
  { id: "doc5", content: "For acute myocardial infarction, immediate reperfusion therapy (e.g. PCI) is critical." },
  { id: "doc6", content: "Opioids should be used cautiously for chronic non-cancer pain due to the risk of addiction and overdose." },
  { id: "doc7", content: "Antibiotics are not effective against viral infections like the common cold or influenza." }
];

/**
 * Retrieves relevant medical context based on the current discussion topic.
 * Currently uses a simple keyword matching algorithm simulating Semantic Vector Search.
 */
export async function retrieveMedicalContext(query: string): Promise<string> {
  const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  const scoredDocs = KNOWLEDGE_BASE.map(doc => {
    let score = 0;
    const docText = doc.content.toLowerCase();
    words.forEach(word => {
      if (docText.includes(word)) score += 1;
    });
    return { ...doc, score };
  });

  const relevantDocs = scoredDocs
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // top 3 most relevant context fragments

  if (relevantDocs.length === 0) return "No specific guidelines retrieved from the knowledge base for this topic.";

  return relevantDocs.map((doc, idx) => `[Source ${idx + 1}]: ${doc.content}`).join("\n");
}
