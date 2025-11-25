import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function postAuthUserLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  // Phase 1: Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Check if account is active (not deleted)
  if (user.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 3: Verify password using PasswordUtil
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 4: Update last_login_at timestamp
  const now = new Date();
  const isoNow = toISOStringSafe(now);

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      last_login_at: isoNow,
      updated_at: isoNow,
    },
  });

  // Phase 5: Create new session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(now);
  const absoluteTimeoutAt = toISOStringSafe(
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.todo_list_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip_address: "127.0.0.1",
      user_agent: "Mozilla/5.0",
      created_at: createdAt,
      last_activity_at: createdAt,
      expired_at: null,
      absolute_timeout_at: absoluteTimeoutAt,
    },
  });

  // Phase 6: Generate JWT tokens
  const accessTokenExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshTokenExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: isoNow,
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
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: isoNow,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Phase 7: Return authorized response
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    last_login_at: isoNow,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpires),
      refreshable_until: toISOStringSafe(refreshTokenExpires),
    },
  };
}
