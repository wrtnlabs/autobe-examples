import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password and create user record
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const user_id = v4();
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create session record with correct 'ip' value
  const session_id = v4();
  const access_expires = new Date(Date.now() + 60 * 60 * 1000);
  const refresh_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const ip: string =
    props.body.ip !== null && props.body.ip !== undefined
      ? (props.body.ip satisfies string as string)
      : "";
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: session_id,
      user_id: user.id,
      ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(access_expires),
    },
  });

  // Prepare JWT token payload and generate tokens
  const payload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: now,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...payload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(access_expires),
    refreshable_until: toISOStringSafe(refresh_expires),
  };

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null || typeof user.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(user.deleted_at),
    token,
  };
}
