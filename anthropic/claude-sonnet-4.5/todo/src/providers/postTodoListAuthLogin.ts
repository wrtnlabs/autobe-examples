import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuthToken";

export async function postTodoListAuthLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListAuthToken> {
  const { body } = props;

  // Find user by email (case-insensitive), excluding soft-deleted accounts
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: body.email.toLowerCase(),
      deleted_at: null,
    },
  });

  // Generic error message to prevent email enumeration
  if (!user) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Verify password against stored hash
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Generate JWT tokens
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const accessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: "user",
    iat: Math.floor(now.getTime() / 1000),
  };

  const refreshTokenPayload = {
    userId: user.id,
    tokenType: "refresh",
    iat: Math.floor(now.getTime() / 1000),
  };

  const jwtSecret = MyGlobal.env.JWT_SECRET_KEY;

  const accessToken = jwt.sign(accessTokenPayload, jwtSecret, {
    expiresIn: "30m",
    algorithm: "HS256",
  });

  const refreshToken = jwt.sign(refreshTokenPayload, jwtSecret, {
    expiresIn: "30d",
    algorithm: "HS256",
  });

  // Hash refresh token for secure storage
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);

  // Store refresh token in database
  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiresAt),
      created_at: toISOStringSafe(now),
    },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: toISOStringSafe(accessTokenExpiresAt),
  };
}
