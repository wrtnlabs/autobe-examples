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

export async function postAuthGuestJoin(props: {
  body: ITodoListGuest.ICreate;
}): Promise<ITodoListGuest.IAuthorized> {
  // Check for duplicate email
  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Generate timestamps
  const now = new Date();
  const nowIsoString = toISOStringSafe(now);
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const absoluteTimeout = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Create user record in todo_list_users
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_login_at: null,
    },
  });

  // Create session record in todo_list_sessions
  const session = await MyGlobal.prisma.todo_list_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      ip_address: "",
      user_agent: "",
      created_at: now,
      last_activity_at: now,
      expired_at: null,
      absolute_timeout_at: absoluteTimeout,
    },
  });

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: user.id,
      session_id: session.id,
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: user.id,
      session_id: session.id,
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized guest user with tokens
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    last_login_at: user.last_login_at
      ? toISOStringSafe(user.last_login_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
