// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { z } from "zod";
import { authService } from "../services/auth.service.js";

const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export async function signup(
  req: Request,
  res: Response,
): Promise<void | Response> {
  try {
    const data = signupSchema.parse(req.body);
    const result = await authService.signup(data);

    res.status(201).json({
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    if (error.message === "Email already registered") {
      return res.status(409).json({ error: error.message });
    }
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
}

export async function signin(
  req: Request,
  res: Response,
): Promise<void | Response> {
  try {
    const data = signinSchema.parse(req.body);
    const result = await authService.signin(data);

    res.json({
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    if (error.message === "Invalid email or password") {
      return res.status(401).json({ error: error.message });
    }
    console.error("Signin error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

export async function refresh(
  req: Request,
  res: Response,
): Promise<void | Response> {
  try {
    const data = refreshSchema.parse(req.body);
    const result = await authService.refresh(data.refreshToken);

    res.json({
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    if (
      error.message.includes("Invalid") ||
      error.message.includes("expired")
    ) {
      return res
        .status(401)
        .json({ error: "Session expired. Please login again." });
    }
    console.error("Refresh error:", error);
    res.status(500).json({ error: "Failed to refresh session" });
  }
}

export async function logout(
  req: Request,
  res: Response,
): Promise<void | Response> {
  try {
    const data = refreshSchema.parse(req.body);
    await authService.logout(data.refreshToken);
    res.json({ message: "Logged out successfully" });
  } catch {
    res.json({ message: "Logged out successfully" });
  }
}

export async function me(req: Request, res: Response) {
  res.json({
    data: {
      id: req.user?.sub,
      email: req.user?.email,
      name: req.user?.name,
      tenantId: req.tenantId,
    },
  });
}
