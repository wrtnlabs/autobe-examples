import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function postAuthGuestRefresh(props: {
  body: ITodoListGuest.IRefresh;
}): Promise<ITodoListGuest.IAuthorized> {
  // Step 1: Verify and decode refresh token
  let decoded: Record<string, unknown>;

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as Record<string, unknown>;
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate decoded token structure and extract values
  if (
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    decoded.type !== "guest"
  ) {
    throw new HttpException("Invalid token structure", 401);
  }

  const decodedId: string & tags.Format<"uuid"> = decoded.id as string &
    tags.Format<"uuid">;
  const decodedSessionId: string & tags.Format<"uuid"> =
    decoded.session_id as string & tags.Format<"uuid">;

  // Step 2: Validate session exists and is active
  const session = await MyGlobal.prisma.todo_list_sessions.findUnique({
    where: {
      id: decodedSessionId,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found or has been terminated", 401);
  }

  // Step 3: Verify session is still active (not logged out)
  if (session.expired_at !== null) {
    throw new HttpException("Session has been terminated", 401);
  }

  // Step 4: Verify session has not exceeded absolute timeout
  const now = new Date();
  if (now > session.absolute_timeout_at) {
    throw new HttpException(
      "Session has expired beyond maximum allowed duration",
      401,
    );
  }

  // Step 5: Verify user still exists and is not deleted
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 6: Verify session user matches decoded token user
  if (session.todo_list_user_id !== decodedId) {
    throw new HttpException("Invalid session for user", 401);
  }

  // Step 7: Update session last_activity_at to current time
  const currentTime = new Date();
  await MyGlobal.prisma.todo_list_sessions.update({
    where: {
      id: decodedSessionId,
    },
    data: {
      last_activity_at: currentTime,
    },
  });

  // Step 8: Generate new access token (same session_id for continuity)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decodedId,
      session_id: decodedSessionId,
      created_at: toISOStringSafe(currentTime),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decodedId,
      session_id: decodedSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(currentTime),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 9: Return authorized guest with new tokens
  return {
    id: decodedId,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    last_login_at: session.user.last_login_at
      ? toISOStringSafe(session.user.last_login_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
