import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoAdminLogin(props: {
  body: ITodoAppTodoAdminLogin.IRequest;
}): Promise<ITodoAppTodoAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.todo_app_todoadmins.findFirst({
    where: {
      email: body.email,
    },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordValid = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (admin.status !== "active") {
    throw new HttpException("Account is not allowed to login", 403);
  }

  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sessionId = v4();

  const session = await MyGlobal.prisma.todo_app_todoadmin_sessions.create({
    data: {
      id: sessionId,
      todo_app_todoadmin_id: admin.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  const tokenCreatedAt = toISOStringSafe(now);

  const accessToken = jwt.sign(
    {
      type: "todoAdmin",
      id: admin.id,
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
      type: "todoAdmin",
      id: admin.id,
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
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  const lastLoginAt: string | null = admin.last_login_at
    ? toISOStringSafe(admin.last_login_at)
    : null;

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name ?? null,
    status: admin.status,
    last_login_at: lastLoginAt,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  };
}
