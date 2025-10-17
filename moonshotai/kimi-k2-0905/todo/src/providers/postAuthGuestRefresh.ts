import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(): Promise<ITodoGuest.IAuthorized> {
  // Access global connection for refresh token retrieval
  const conn = (global as any).nestiaConnection;
  const authHeader = conn?.headers?.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpException(
      "Authorization header with refresh token required",
      401,
    );
  }

  const currentToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Decode the refresh token to get guest information
    const decoded = jwt.decode(currentToken) as any;

    if (!decoded || decoded.type !== "guest" || !decoded.session_identifier) {
      throw new HttpException("Invalid guest refresh token", 401);
    }

    const sessionIdentifier = decoded.session_identifier;

    // Find guest by session identifier
    const guest = await MyGlobal.prisma.todo_guest.findFirst({
      where: { session_identifier: sessionIdentifier },
    });

    if (!guest) {
      throw new HttpException("Guest session not found", 404);
    }

    const now = toISOStringSafe(new Date());

    // Update guest's last activity timestamp
    await MyGlobal.prisma.todo_guest.update({
      where: { id: guest.id },
      data: { last_activity_at: now },
    });

    // Generate new JWT token with GuestPayload structure
    const payload = {
      id: guest.id,
      type: "guest",
    };

    // Create new access token
    const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    });

    // Create new refresh token
    const refreshToken = jwt.sign(
      {
        ...payload,
        tokenType: "refresh",
        session_identifier: guest.session_identifier,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600000)),
      refreshable_until: toISOStringSafe(new Date(Date.now() + 604800000)),
    };

    return {
      id: guest.id,
      token,
      session_identifier: guest.session_identifier,
    };
  } catch (error) {
    throw new HttpException("Failed to refresh guest session", 401);
  }
}
