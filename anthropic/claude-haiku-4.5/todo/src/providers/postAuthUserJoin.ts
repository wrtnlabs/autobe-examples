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

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  // Check for duplicate email
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create timestamps
  const now = new Date();
  const nowISOString = toISOStringSafe(now);
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const absoluteTimeoutDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Create user actor
  const userId = v4() as string & tags.Format<"uuid">;
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email.toLowerCase(),
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_login_at: null,
    },
  });

  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.todo_list_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip_address: props.body.ip ?? "127.0.0.1",
      user_agent: props.body.user_agent ?? "Unknown",
      created_at: now,
      last_activity_at: now,
      expired_at: null,
      absolute_timeout_at: absoluteTimeoutDate,
    },
  });

  // Generate JWT tokens
  const tokenPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: nowISOString,
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Map response
  const userResponse: ITodoListUser = {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    last_login_at: user.last_login_at
      ? toISOStringSafe(user.last_login_at)
      : null,
  };

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    last_login_at: user.last_login_at
      ? toISOStringSafe(user.last_login_at)
      : null,
    user: userResponse,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  };
}
