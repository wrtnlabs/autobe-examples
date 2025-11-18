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
  // Step 1: Decode and verify provided refresh_token
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "user" };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Lookup the user session and user by decoded token
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_user_id: decoded.id,
      expired_at: null,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: decoded.id },
  });
  if (!user || user.is_locked) {
    throw new HttpException("Account locked or does not exist", 403);
  }

  // Step 3: Generate new access and refresh tokens
  const accessExpiresMs = 60 * 60 * 1000; // 1h
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000; // 7d
  const now = Date.now();
  const accessExpiresAt: string = toISOStringSafe(
    new Date(now + accessExpiresMs),
  );
  const refreshExpiresAt: string = toISOStringSafe(
    new Date(now + refreshExpiresMs),
  );
  const created_at: string = toISOStringSafe(new Date(now));

  const accessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: created_at,
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
      created_at: created_at,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });

  // Shape the output DTO to ITodoListUser.IAuthorized
  return {
    id: user.id,
    email: user.email,
    is_locked: user.is_locked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    user: {
      id: user.id,
      email: user.email,
      is_locked: user.is_locked,
    },
  };
}
