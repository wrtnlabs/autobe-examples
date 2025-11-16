import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserLogin(props: {
  body: ITodoAppTodoUserLogin.IRequest;
}): Promise<ITodoAppTodoUser.IAuthorized> {
  const body = props.body;

  const user = await MyGlobal.prisma.todo_app_todousers.findFirst({
    where: {
      email: body.email,
    },
  });

  const invalidCredentialsMessage = "Invalid credentials";

  if (!user) {
    throw new HttpException(invalidCredentialsMessage, 401);
  }

  if (user.status !== "active") {
    throw new HttpException(invalidCredentialsMessage, 401);
  }

  const passwordOk = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );

  if (!passwordOk) {
    throw new HttpException(invalidCredentialsMessage, 401);
  }

  const nowDate = new Date();
  const nowIso = toISOStringSafe(nowDate);

  const updatedUser = await MyGlobal.prisma.todo_app_todousers.update({
    where: {
      id: user.id,
    },
    data: {
      last_login_at: nowIso,
      updated_at: nowIso,
    },
  });

  const sessionId = v4();

  const session = await MyGlobal.prisma.todo_app_todouser_sessions.create({
    data: {
      id: sessionId,
      todo_app_todouser_id: updatedUser.id,
      // Columns are non-nullable string, so do not pass null; use empty string when value is absent.
      ip: body.ip ?? "",
      href:
        (body.href ?? null) !== null
          ? ((body.href ?? "") satisfies string as string)
          : "",
      referrer:
        (body.referrer ?? null) !== null
          ? ((body.referrer ?? "") satisfies string as string)
          : "",
      created_at: nowIso,
      expired_at: null,
    },
  });

  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "todouser",
        id: updatedUser.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "todouser",
        id: updatedUser.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  // Convert Prisma Date | null field to the expected string | null | undefined using toISOStringSafe.
  const lastLoginAtRaw = updatedUser.last_login_at;
  const lastLoginAt: (string & tags.Format<"date-time">) | null | undefined =
    lastLoginAtRaw !== null && lastLoginAtRaw !== undefined
      ? toISOStringSafe(lastLoginAtRaw)
      : null;

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    displayName: updatedUser.display_name ?? null,
    status: updatedUser.status,
    last_login_at: lastLoginAt,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    token,
  };
}
