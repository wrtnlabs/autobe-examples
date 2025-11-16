import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserRefresh";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserRefresh(props: {
  body: ITodoAppTodoUserRefresh.IRequest;
}): Promise<ITodoAppTodoUser.IAuthorized> {
  let rawDecoded: unknown;

  try {
    rawDecoded = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const decoded = rawDecoded as {
    id: string;
    session_id: string;
    type: string;
  };

  if (!decoded || decoded.type !== "todouser") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_app_todouser_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_todouser_id: decoded.id,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.expired_at !== null) {
    throw new HttpException("Session has already expired", 401);
  }

  const user = await MyGlobal.prisma.todo_app_todousers.findFirst({
    where: {
      id: decoded.id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 401);
  }

  if (user.status !== "active") {
    throw new HttpException("Account is not allowed to access", 403);
  }

  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000;

  const accessExpiresDate = new Date(accessExpiresMs);
  const refreshExpiresDate = new Date(refreshExpiresMs);

  const createdAtIso = new Date(nowMs).toISOString();

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.todo_app_todouser_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpiresDate,
    },
  });

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpiresDate),
    refreshable_until: toISOStringSafe(refreshExpiresDate),
  };

  const displayName: string | null | undefined =
    typeof user.display_name === "string" ? user.display_name : null;

  const lastLoginAt: string | null | undefined = user.last_login_at
    ? toISOStringSafe(user.last_login_at)
    : null;

  const authorized: ITodoAppTodoUser.IAuthorized = {
    id: user.id,
    email: user.email,
    displayName,
    status: user.status,
    last_login_at: lastLoginAt,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  };

  return authorized;
}
