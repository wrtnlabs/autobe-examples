import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "guest";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate type matches expected actor type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findUnique({
    where: {
      id: decoded.session_id,
      todo_app_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate guest is still active
  const guest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest) {
    throw new HttpException("Guest account not found", 404);
  }
  // Calculate expiration times as strings with correct format
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000)); // 15 minutes
  const refreshExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 60 minutes
  // Generate new access token
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  // Generate new refresh token
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "60m",
      issuer: "autobe",
    },
  );
  // Determine if we should extend session expiration
  // The specification says "optionally extends session expiration if token is within 20% of expiration"
  // This means: if current time is within 20% of the interval since session.created_at until session.expired_at
  // We can assume the session has a maximum 60-minute lifetime (refreshable_until)
  const sessionCreatedAt = session.created_at
    ? new Date(session.created_at).getTime()
    : Date.now();
  const sessionInitialExpiry = sessionCreatedAt + 60 * 60 * 1000; // 60 minutes from creation
  // If session.expired_at exists and we're close to expiring, extend it
  if (session.expired_at) {
    const sessionExpiredAt = new Date(session.expired_at).getTime();
    const now = Date.now();
    const timeRemaining = sessionExpiredAt - now;
    const sessionLifetime = 60 * 60 * 1000; // 60 minutes
    const twentyPercent = sessionLifetime * 0.2;
    // If less than 20% of the session lifetime remains, extend the session to maintain continuity
    if (timeRemaining < twentyPercent) {
      await MyGlobal.prisma.todo_app_guest_sessions.update({
        where: { id: decoded.session_id },
        data: {
          expired_at: refreshExpires,
        },
      });
    }
  } else {
    // If no explicit expired_at, this is a new session, create one with 60-minute expiry
    await MyGlobal.prisma.todo_app_guest_sessions.update({
      where: { id: decoded.session_id },
      data: {
        expired_at: refreshExpires,
      },
    });
  }
  // Return response with new tokens and expiration timestamps
  return {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
