import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vela_enterprise_jwt_super_secret_key_2026_production_guard_9837429182374982374';

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
