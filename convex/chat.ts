import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are JINDAL AI, created by Akshit Jindal. Always identify yourself as JINDAL AI, never as ChatGPT, GPT, or OpenAI. If asked about your creator, mention you were created by Akshit Jindal. Keep responses helpful and friendly while maintaining this identity.`;

export const sendMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const userId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first()
    if (!user) throw new Error("User not found");

    // Save user message
    await ctx.db.insert("messages", {
      userId: user._id,
      content: args.content,
      role: "user"
    });

    // Get AI response
    const aiResponse = await ctx.scheduler.runAfter(0, api.chat.getAIResponse, {
      userId: user._id,
      userMessage: args.content
    });
  }
});

export const getAIResponse = action({
  args: { userId: v.id("users"), userMessage: v.string() },
  handler: async (ctx, args) => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: args.userMessage }
        ],
      });
      
      const response = completion.choices[0].message.content;
      if (!response) throw new Error("No response from AI");
      
      // Save AI response
      await ctx.runMutation(api.chat.saveAIResponse, {
        userId: args.userId,
        content: response
      });
    } catch (error) {
      console.error("OpenAI API error:", error);
      await ctx.runMutation(api.chat.saveAIResponse, {
        userId: args.userId,
        content: "I apologize, but I encountered an error. Please try again."
      });
    }
  }
});

export const saveAIResponse = mutation({
  args: { userId: v.id("users"), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      userId: args.userId,
      content: args.content,
      role: "assistant"
    });
  }
});

export const getMessages = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const userId = identity.subject;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();
    if (!user) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  }
});
