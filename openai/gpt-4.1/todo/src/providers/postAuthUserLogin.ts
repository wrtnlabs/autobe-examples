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
  const { email, password } = props.body;
  // Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid = await PasswordUtil.verify(password, user.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Update last_login (Date converted to ISO string)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: { last_login: now },
  });

  // JWT access/refresh tokens
  const accessTokenExpiresInSeconds = 60 * 60; // 1 hour
  const refreshTokenExpiresInSeconds = 60 * 60 * 24 * 7; // 7 days
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresInSeconds * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresInSeconds * 1000),
  );

  const access = jwt.sign(
    { id: user.id, type: "user" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresInSeconds,
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    { id: user.id, type: "user", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresInSeconds,
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
