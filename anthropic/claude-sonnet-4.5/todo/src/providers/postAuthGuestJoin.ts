import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: ITodoListGuest.ICreate;
}): Promise<ITodoListGuest.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const currentTime: string = toISOStringSafe(new Date());
  const accessExpiresMs: number = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs: number = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpires: string = toISOStringSafe(new Date(accessExpiresMs));
  const refreshExpires: string = toISOStringSafe(new Date(refreshExpiresMs));

  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      name: props.body.name ?? undefined,
      created_at: currentTime,
      updated_at: currentTime,
    },
  });

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: currentTime,
    },
  });

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: currentTime,
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
        created_at: currentTime,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: user.id,
    token,
  };
}
