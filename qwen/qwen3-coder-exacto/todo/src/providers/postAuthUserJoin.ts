import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoListUserListUser.IJoin;
  ip: string;
  href: string;
  referrer: string;
}): Promise<ITodoListUserListUser.IAuthorized> {
  // Check if user with this email already exists
  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Generate user ID
  const userId = v4() as string & tags.Format<"uuid">;

  // Get current timestamp as ISO string
  const currentTimestamp = toISOStringSafe(new Date());

  // Create the user record
  const createdUser = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password: hashedPassword, // Fixed: use 'password' instead of 'password_hash'
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });

  // Create session
  const sessionId = v4() as string & tags.Format<"uuid">;

  // Calculate expiration times as ISO strings
  const now = new Date();
  const accessExpires = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: userId,
      ip: props.ip, // Use actual IP from request context
      href: props.href, // Use actual href from request context
      referrer: props.referrer, // Use actual referrer from request context
      created_at: currentTimestamp,
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens
  const tokenCreatedAt = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    {
      type: "user",
      id: userId,
      session_id: sessionId,
      created_at: tokenCreatedAt,
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
      id: userId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Prepare authorization token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Return authorized user
  return {
    id: createdUser.id,
    email: createdUser.email,
    token,
  };
}
