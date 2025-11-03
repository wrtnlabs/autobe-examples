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

export async function postTodoListUsersLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorization> {
  const { body } = props;

  // Find user by email and ensure account is active
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  // Generic error message to prevent account enumeration
  if (!user) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Verify password using secure comparison
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Determine IP address - use provided IP or fallback
  const ipAddress = body.ip ?? "0.0.0.0";

  // Calculate token expiration times
  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
  const refreshTokenExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Generate JWT tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
  });

  const refreshToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });

  // Create session record
  const sessionId = v4();
  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip: ipAddress,
      href: body.href,
      referrer: body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: null,
    },
  });

  // Return authorization response
  return {
    id: user.id,
    email: user.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
