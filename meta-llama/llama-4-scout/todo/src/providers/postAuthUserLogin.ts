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
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });
  if (!user || !user.is_active || !user.is_verified) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpiresDate = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();

  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip:
        typeof props.body.ip === "string"
          ? (props.body.ip satisfies string as string)
          : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpiresDate),
    },
  });

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
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
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpiresDate),
    refreshable_until: toISOStringSafe(refreshExpiresDate),
  };

  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    is_verified: user.is_verified,
    is_active: user.is_active,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token,
    user: undefined,
  };
}
