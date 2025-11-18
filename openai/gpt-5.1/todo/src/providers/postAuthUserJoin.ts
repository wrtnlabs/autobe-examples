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
  body: ITodoListUser.IJoin;
}): Promise<ITodoListUser.IAuthorized> {
  // Check for existing user (case-insensitive), including soft-deleted
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const user_id = v4();

  // Create the user record
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: user_id,
      email: props.body.email.toLowerCase(),
      password_hash,
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate token expirations
  const accessExpireTime = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpireTime = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Compose JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpireTime,
    refreshable_until: refreshExpireTime,
  };
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: undefined,
    token,
  };
}
