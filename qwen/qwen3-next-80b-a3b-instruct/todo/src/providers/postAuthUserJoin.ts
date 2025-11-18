import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoUser.IJoin;
}): Promise<ITodoUser.IAuthorized> {
  const exists = await MyGlobal.prisma.todo_user.findFirst({
    where: { email: props.body.email },
  });
  if (exists) {
    throw new HttpException(
      "Registration failed: email already registered.",
      409,
    );
  }
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const user_id = v4();
  const user = await MyGlobal.prisma.todo_user.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const session_id = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
  const ipVal =
    typeof props.body.ip === "string"
      ? (props.body.ip satisfies string as string)
      : "";
  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: session_id,
      todo_user_id: user.id,
      ip: ipVal,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session_id,
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
        session_id: session_id,
        tokenType: "refresh",
        created_at: now,
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
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null && user.deleted_at !== undefined
        ? toISOStringSafe(user.deleted_at)
        : null,
    token,
  };
}
