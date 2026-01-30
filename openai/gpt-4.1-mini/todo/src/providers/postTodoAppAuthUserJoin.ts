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
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";

export async function postTodoAppAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Check if username already exists
  const existingUsername = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { username: props.body.username },
  });
  if (existingUsername) {
    throw new HttpException("Username already registered", 409);
  }
  // Check if email already exists
  const existingEmail = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const createdAt = toISOStringSafe(new Date());
  // Create user record
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4(),
      username: props.body.username,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
  });
  // Calculate session expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Create session record
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      ip: (props.body as any).ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // Prepare token payloads
  const nowISO = toISOStringSafe(new Date());
  const accessTokenPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: nowISO,
  };
  const refreshTokenPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: nowISO,
  };
  // Sign tokens
  const token: ITodoAppAccessToken = {
    access: jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(refreshTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    }),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return authorized user data with token plus missing fields
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: false, // Added missing required boolean field
    verified: false, // Added missing required boolean field
    lastLoginAt: false, // Added missing required boolean field
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    passwordHash: true,
    token,
  };
}
