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

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  // Normalize email to lowercase
  const normalizedEmail = body.email.toLowerCase();

  // Check if email already exists (excluding deleted accounts)
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: normalizedEmail,
      deleted_at: null,
    },
  });

  if (existingUser) {
    throw new HttpException(
      "An account with this email address already exists",
      409,
    );
  }

  // Hash the password securely
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate user ID
  const userId = v4() as string & tags.Format<"uuid">;

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create the user account
  await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate token expiration times
  const accessTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Generate JWT access token with UserPayload structure
  const accessToken = jwt.sign(
    {
      id: userId,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: userId,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Hash and store the refresh token
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);
  const refreshTokenId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: refreshTokenId,
      todo_list_user_id: userId,
      token_hash: refreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiry),
      created_at: now,
    },
  });

  // Return authenticated user response
  return {
    id: userId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
