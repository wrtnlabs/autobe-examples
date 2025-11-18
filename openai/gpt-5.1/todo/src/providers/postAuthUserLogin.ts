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
  // 1. Find a user by email and ensure not soft-deleted
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!user) {
    // Generic error to prevent account enumeration
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password using PasswordUtil
  const valid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Create session record
  const now = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  const sessionId = v4();

  // Compose data, only including ip if it exists and not null.
  const sessionData: any = {
    id: sessionId,
    todo_list_user_id: user.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: accessExpiresAt,
  };
  if (props.body.ip !== null && props.body.ip !== undefined) {
    sessionData.ip = props.body.ip satisfies string as string;
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: sessionData,
  });

  // 4. Generate JWT tokens (access and refresh)
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
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
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  // 5. Return authorized user response (never use as-casting)
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    token,
  };
}
