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

export async function postAuthGuestJoin(props: {
  body: ITodoListUser.IRegister;
}): Promise<ITodoListUser.IAuthorized> {
  const { body } = props;

  // Check if email already exists
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: body.email.toLowerCase(),
      deleted_at: null,
    },
  });

  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Create new user
  const now = toISOStringSafe(new Date());
  const userId = v4();

  const newUser = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: body.email.toLowerCase(),
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT tokens
  const accessTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const accessToken = jwt.sign(
    {
      id: newUser.id,
      email: newUser.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: newUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Hash and store refresh token
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);
  const refreshTokenId = v4();

  await MyGlobal.prisma.todo_list_refresh_tokens.create({
    data: {
      id: refreshTokenId,
      todo_list_user_id: newUser.id,
      token_hash: refreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiry),
      created_at: now,
    },
  });

  // Return authorization response
  return {
    id: newUser.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
