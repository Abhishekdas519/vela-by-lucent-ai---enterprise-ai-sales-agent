import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable is missing in production.');
    }
    return 'vela_jwt_dev_local_secret_for_sandbox_and_unit_tests_only';
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();

export interface TokenPayload {
  uid: string;
  email: string;
  role: 'admin' | 'client';
  displayName?: string;
  clientId?: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (!decoded || !decoded.uid || !decoded.email) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Unauthorized: Token is expired or invalid' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin master privilege required' });
    }
    next();
  });
};
