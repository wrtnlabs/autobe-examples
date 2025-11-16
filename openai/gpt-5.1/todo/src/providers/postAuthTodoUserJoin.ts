import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserJoin(props: {
  body: ITodoAppTodoUserJoin.IRequest;
}): Promise<ITodoAppTodoUser.IAuthorized> {
  const { body } = props;

  const existingUser = await MyGlobal.prisma.todo_app_todousers.findFirst({
    where: {
      email: body.email,
    },
  });

  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const passwordHash = await PasswordUtil.hash(body.password);

  const now = new Date();
  const nowIso = toISOStringSafe(now);

  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiresIso = toISOStringSafe(accessExpires);
  const refreshExpiresIso = toISOStringSafe(refreshExpires);

  const { user, session } = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdUser = await tx.todo_app_todousers.create({
      data: {
        id: v4(),
        email: body.email,
        password_hash: passwordHash,
        display_name:
          body.display_name === null || body.display_name === undefined
            ? null
            : body.display_name,
        status: "active",
        last_login_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    });

    const createdSession = await tx.todo_app_todouser_sessions.create({
      data: {
        id: v4(),
        todo_app_todouser_id: createdUser.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: nowIso,
        expired_at: accessExpiresIso,
      },
    });

    return {
      user: createdUser,
      session: createdSession,
    };
  });

  const tokenCreatedAt = nowIso;

  const accessToken = jwt.sign(
    {
      type: "todouser",
      id: user.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "todouser",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  const result: ITodoAppTodoUser.IAuthorized = {
    id: user.id,
    email: user.email,
    displayName: user.display_name === null ? null : user.display_name,
    status: user.status,
    last_login_at: null,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  };

  return result;
}
