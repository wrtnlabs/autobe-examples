import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Validate email uniqueness (JSON Schema already validated format)
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Generate timestamps as string & tags.Format<'date-time'> without type assertions
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create user record without 'active' property which doesn't exist in schema
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      display_name: props.body.email.split("@")[0],
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Generate email verification token
  const verificationToken = v4();
  // Create email verification record
  await MyGlobal.prisma.todo_app_user_email_verifications.create({
    data: {
      id: v4(),
      user_id: user.id,
      token: verificationToken,
      expired_at: expiresAt, // Fixed: changed expires_at to expired_at per error hint
      created_at: now,
    },
  });
  // Create session record with required ip, href, referrer properties
  const sessionId = v4();
  await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      user_id: user.id,
      created_at: now,
      expired_at: accessExpires,
      ip: "127.0.0.1",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // Generate JWT tokens with exact payload structure and proper dates
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      created_at: now,
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
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return authorized user with token with proper structure matching ITodoAppUser.IAuthorized
  return {
    display_name: props.body.email.split("@")[0],
    email: user.email,
    created_at: toISOStringSafe(user.created_at), // Fixed: convert Date to string
    updated_at: toISOStringSafe(user.updated_at), // Fixed: convert Date to string
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ITodoAppUser.IAuthorized;
}
