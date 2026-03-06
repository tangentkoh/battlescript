// 問題の生成
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
);

export interface Problem {
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  sample_input: string;
  sample_output: string;
  test_cases: { input: string; output: string }[];
}

export async function generateProblem(
  difficulty: "easy" | "medium" | "hard",
): Promise<Problem> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
  });

  const prompt = `
    あなたは競技プログラミングの問題作成者です。
    以下の条件で、C++で解くための問題を1つ作成し、JSON形式のみで出力してください。
    
    【条件】
    - 難易度: ${difficulty}
    - 形式: 
      {
        "title": "問題タイトル",
        "description": "問題文（日本語）",
        "input_format": "入力形式の説明",
        "output_format": "出力形式の説明",
        "sample_input": "入力例1",
        "sample_output": "出力例1",
        "test_cases": [{"input": "テスト用入力1", "output": "テスト用出力1"}] 
      }
    - 注意: JSON以外の文章は一切含めないでください。
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON部分だけを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON_PARSE_ERROR");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// コードのジャッジ
export async function judgeCode(
  problem: Problem,
  code: string,
  language: string,
): Promise<{ isCorrect: boolean; feedback: string }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
  });

  const prompt = `
    あなたは競技プログラミングのジャッジシステムです。
    以下の問題に対して、提出されたコードが正解(AC)か不正解(WA)かを判定してください。

    【問題】
    ${problem.description}
    サンプル入力: ${problem.sample_input}
    サンプル出力: ${problem.sample_output}

    【提出コード】（言語: ${language}）
    ${code}

    【判定基準】
    - アルゴリズムが正しいか
    - サンプル入出力の条件を満たしているか
    - JSON形式で以下の通り出力してください
    {
      "isCorrect": true または false,
      "feedback": "簡潔なフィードバック（日本語）"
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const cleanJson = response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(cleanJson);
}

// curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
// モデルの一覧
