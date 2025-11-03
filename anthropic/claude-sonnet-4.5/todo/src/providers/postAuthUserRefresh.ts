import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate type matches expected actor type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and user is active
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 4: Generate new tokens with SAME session_id
  const nowTimestamp = Date.now();
  const accessExpiresMs = nowTimestamp + 60 * 60 * 1000;
  const refreshExpiresMs = nowTimestamp + 7 * 24 * 60 * 60 * 1000;

  const nowIso = toISOStringSafe(new Date(nowTimestamp));
  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresMs));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresMs));

  const accessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 5: Update session expiration time
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: toISOStringSafe(new Date(refreshExpiresMs)),
    },
  });

  // Step 6: Return user profile with new tokens
  return {
    id: session.user.id,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at: session.user.deleted_at
      ? toISOStringSafe(session.user.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
