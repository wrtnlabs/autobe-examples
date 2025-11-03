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
  // Phase 1: Validate Actor Credentials
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Create NEW Session Record
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      todo_list_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: null,
    },
  });

  // Phase 3: Generate JWT Tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "15m",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authenticated user profile
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token,
  };
}
