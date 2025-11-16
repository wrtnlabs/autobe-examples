import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminRefresh";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoAdminRefresh(props: {
  body: ITodoAppTodoAdminRefresh.IRequest;
}): Promise<ITodoAppTodoAdmin.IAuthorized> {
  // Define the expected JWT payload shape to avoid using 'any'
  interface ITodoAdminJwtPayload extends jwt.JwtPayload {
    type: "todoAdmin";
    id: string;
    session_id: string;
  }

  let decoded: ITodoAdminJwtPayload | null = null;

  try {
    const raw = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );

    // jwt.verify can return string | JwtPayload; ensure it's an object
    if (typeof raw !== "object" || raw === null) {
      throw new HttpException("Invalid refresh token payload", 401);
    }

    const payload = raw as ITodoAdminJwtPayload;

    // Basic runtime shape validation for required fields
    if (
      payload.type !== "todoAdmin" ||
      typeof payload.id !== "string" ||
      typeof payload.session_id !== "string"
    ) {
      throw new HttpException("Invalid refresh token payload", 401);
    }

    decoded = payload;
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (!decoded || decoded.type !== "todoAdmin") {
    throw new HttpException("Invalid refresh token type", 403);
  }

  const session = await MyGlobal.prisma.todo_app_todoadmin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_todoadmin_id: decoded.id,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Fetch the related admin record explicitly since include relation is not
  // exposed on the session type in this environment.
  const admin = await MyGlobal.prisma.todo_app_todoadmins.findUnique({
    where: {
      id: session.todo_app_todoadmin_id,
    },
  });

  if (!admin) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (admin.status === "suspended" || admin.status === "closed") {
    throw new HttpException("Administrator account is not active", 403);
  }

  if (session.expired_at) {
    const expiredAtTime = new Date(session.expired_at).getTime();
    const nowMillis = Date.now();
    if (!Number.isFinite(expiredAtTime) || expiredAtTime <= nowMillis) {
      throw new HttpException("Session expired or revoked", 401);
    }
  }

  const nowMillis = Date.now();
  const accessExpiresMillis = nowMillis + 60 * 60 * 1000;
  const refreshExpiresMillis = nowMillis + 7 * 24 * 60 * 60 * 1000;

  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresMillis));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresMillis));

  const accessToken = jwt.sign(
    {
      type: "todoAdmin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "todoAdmin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.todo_app_todoadmin_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresMillis),
    },
  });

  const displayNameValue =
    admin.display_name === null ? null : admin.display_name;
  const lastLoginAtValue =
    admin.last_login_at === null ? null : toISOStringSafe(admin.last_login_at);

  return {
    id: admin.id,
    email: admin.email,
    display_name: displayNameValue,
    status: admin.status,
    last_login_at: lastLoginAtValue,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
