import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogin(props: {
  user: UserPayload;
  body: ITodoListTodoListUser.ILogin;
}): Promise<ITodoListTodoListUser.IAuthorized> {
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpireMs = 60 * 60 * 1000;
  const refreshExpireMs = 7 * 24 * 60 * 60 * 1000;

  const expiredAt = toISOStringSafe(new Date(Date.now() + accessExpireMs));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshExpireMs),
  );

  const sessionData: {
    id: string & tags.Format<"uuid">;
    todo_list_user_id: string & tags.Format<"uuid">;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;
    created_at: string & tags.Format<"date-time">;
    expired_at: string & tags.Format<"date-time">;
    ip: string;
  } = {
    id: v4() as string & tags.Format<"uuid">,
    todo_list_user_id: user.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: nowIso,
    expired_at: expiredAt,
    ip:
      props.body.ip !== null && props.body.ip !== undefined
        ? props.body.ip
        : "",
  };

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: sessionData,
  });

  const tokenPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: nowIso,
  };

  const tokens = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };

  return {
    id: user.id,
    token: tokens,
  };
}
