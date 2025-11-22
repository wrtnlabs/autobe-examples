import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

export async function guestuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestuserPayload> {
  // Guest users can access without authentication, but if they provide a token,
  // we need to validate it's not a malformed token
  if (request.headers.authorization) {
    try {
      const payload: any = jwtAuthorize({ request });
      
      // If token is provided, it must be for guestuser role
      if (payload.type !== "guestuser") {
        throw new ForbiddenException(`Invalid token type for guest access`);
      }
      
      // Return the payload as-is for guest users with tokens
      return payload as GuestuserPayload;
    } catch (error) {
      // For guest users, if token is invalid, still allow access as anonymous
      // This allows mixed authenticated/unauthenticated browsing
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        // Continue as anonymous guest user
      } else {
        throw error;
      }
    }
  }
  
  // Return anonymous guest user payload
  // For anonymous access, we generate a temporary session ID
  const anonymousSessionId = crypto.randomUUID();
  
  return {
    id: "anonymous", // Special ID for anonymous users
    session_id: anonymousSessionId,
    type: "guestuser"
  };
}