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

export async function postAuthUserLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Step 1: Find the user by email
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });

  if (!user) {
    // TODO: Insert failed login attempt into audit log here if desired.
    throw new HttpException("Invalid credentials", 401);
  }

  if (user.is_locked) {
    // Log if necessary; do not reveal locked status
    throw new HttpException("Invalid credentials", 401);
  }

  // Password verification
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isPasswordValid) {
    // TODO: Insert failed login attempt into audit log if desired.
    throw new HttpException("Invalid credentials", 401);
  }

  // Create session record
  const sessionId = v4();
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip: "", // Optionally capture from client if available
      href: "",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // JWT token generation with exact payload format
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    email: user.email,
    is_locked: user.is_locked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    user: {
      id: user.id,
      email: user.email,
      is_locked: user.is_locked,
    },
  };
}
