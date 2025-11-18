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
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowTimestamp = Date.now();
  const accessExpiresTimestamp = nowTimestamp + 60 * 60 * 1000;
  const refreshExpiresTimestamp = nowTimestamp + 7 * 24 * 60 * 60 * 1000;

  const nowISO = toISOStringSafe(new Date(nowTimestamp));
  const accessExpiresISO = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpiresISO = toISOStringSafe(new Date(refreshExpiresTimestamp));

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      user_id: user.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowISO,
      expired_at: null,
    },
  });

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: nowISO,
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
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };

  return {
    id: user.id,
    email: user.email,
    name: user.name === null ? undefined : user.name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    token,
  };
}
