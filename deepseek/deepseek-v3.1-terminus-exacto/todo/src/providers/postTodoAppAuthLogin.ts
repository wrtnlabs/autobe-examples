import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postTodoAppAuthLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthResponse> {
  const { body } = props;

  // Step 1: Find user by email
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null, // Only active users (not soft deleted)
    },
  });

  // Step 2: Validate user exists
  if (!user) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Step 3: Check user status
  if (user.status !== "active") {
    throw new HttpException("Account is not active", 401);
  }

  // Step 4: Verify password
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Step 5: Calculate token expiration times using ISO strings
  const now = toISOStringSafe(new Date());
  const nowTime = new Date(now).getTime();

  const accessTokenExpiry = toISOStringSafe(
    new Date(nowTime + 24 * 60 * 60 * 1000),
  ); // 24 hours
  const refreshTokenExpiry = toISOStringSafe(
    new Date(nowTime + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Step 6: Generate JWT tokens
  const accessToken = jwt.sign(
    {
      sub: user.id,
      type: "access",
      iat: Math.floor(nowTime / 1000),
      exp: Math.floor(new Date(accessTokenExpiry).getTime() / 1000),
    },
    MyGlobal.env.JWT_SECRET_KEY,
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      type: "refresh",
      iat: Math.floor(nowTime / 1000),
      exp: Math.floor(new Date(refreshTokenExpiry).getTime() / 1000),
    },
    MyGlobal.env.JWT_SECRET_KEY,
  );

  // Step 7: Create session record
  const sessionId = v4();
  await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      ip: body.ip ?? "unknown",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: refreshTokenExpiry,
    },
  });

  // Step 8: Return auth response
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
