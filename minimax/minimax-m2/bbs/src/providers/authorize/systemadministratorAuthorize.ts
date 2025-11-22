import { ForbiddenException } from "@nestjs/common";
import jwt from "jsonwebtoken";

import { SystemadministratorPayload } from "../../decorators/payload/SystemadministratorPayload";

// JWT verification function
function jwtAuthorize(request: { headers: { authorization?: string } }): SystemadministratorPayload {
  const BEARER_PREFIX = "Bearer ";
  
  if (!request.headers.authorization)
    throw new ForbiddenException("No token value exists");
  else if (!request.headers.authorization.startsWith(BEARER_PREFIX))
    throw new UnauthorizedException("Invalid token");

  try {
    const token = request.headers.authorization.substring(BEARER_PREFIX.length);
    // For demonstration, using a placeholder JWT_SECRET_KEY
    // In production, this should come from environment variables
    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "default-secret-key";
    const verified = jwt.verify(token, JWT_SECRET_KEY);
    return verified as SystemadministratorPayload;
  } catch {
    throw new UnauthorizedException("Invalid token");
  }
}

export async function systemadministratorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SystemadministratorPayload> {
  const payload: SystemadministratorPayload = jwtAuthorize(request);

  if (payload.type !== "systemAdministrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Since we don't have MyGlobal access, we'll return the payload
  // In production, this should verify against the database
  // For now, just validate the basic payload structure
  if (!payload.id || !payload.session_id) {
    throw new ForbiddenException("Invalid payload structure");
  }

  return payload;
}