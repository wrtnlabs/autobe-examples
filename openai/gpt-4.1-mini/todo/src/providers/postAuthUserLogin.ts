import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";

export async function postAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      username: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
      accessTokens: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          expired_at: true,
          todo_app_guest_id: true,
          todo_app_user_session_id: true,
          token: true,
          type: true,
          issued_at: true,
          revoked_at: true,
        },
      },
      refreshTokens: {
        select: {
          id: true,
          created_at: true,
          token_expired_at: true,
          verified_at: true,
          deleted_at: true,
          token: true,
        },
      },
      emailVerifications: {
        select: {
          id: true,
          created_at: true,
          deleted_at: true,
          token: true,
          token_expired_at: true,
          verified_at: true,
        },
      },
      userPasswordResets: {
        select: {
          id: true,
          created_at: true,
          deleted_at: true,
          token: true,
          expires_at: true,
          requested_at: true,
          updated_at: true,
        },
      },
      userRoles: {
        select: {
          id: true,
          created_at: true,
          status: true,
          updated_at: true,
        },
      },
      sessions: {
        select: {
          id: true,
          created_at: true,
          ip: true,
          href: true,
          referrer: true,
          expired_at: true,
        },
      },
      todoItems: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          description: true,
          title: true,
          status: true,
        },
      },
      auditLogs: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          todo_app_todo_item_id: true,
          action: true,
        },
      },
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
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href!,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token: ITodoAppAccessToken = {
    access: jwt.sign(
      { type: "user", id: user.id, session_id: session.id, created_at: now },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
    token: true,
    type: true,
    issued_at: now,
  };
  const convertedAccessTokens = user.accessTokens.map((token) => ({
    id: token.id,
    created_at: toISOStringSafe(token.created_at),
    updated_at: toISOStringSafe(token.updated_at),
    todo_app_user_id: token.todo_app_user_id ?? null,
    expired_at: toISOStringSafe(token.expired_at),
    todo_app_guest_id: token.todo_app_guest_id ?? null,
    todo_app_user_session_id: token.todo_app_user_session_id ?? null,
    token: token.token,
    type: token.type,
    issued_at: toISOStringSafe(token.issued_at),
    revoked_at:
      token.revoked_at !== null ? toISOStringSafe(token.revoked_at) : null,
  }));
  const convertedRefreshTokens = user.refreshTokens.map((token) => ({
    id: token.id,
    created_at: toISOStringSafe(token.created_at),
    deleted_at:
      token.deleted_at !== null ? toISOStringSafe(token.deleted_at) : null,
    token: token.token,
    token_expired_at: toISOStringSafe(token.token_expired_at),
    verified_at:
      token.verified_at !== null ? toISOStringSafe(token.verified_at) : null,
  }));
  const convertedEmailVerifications = user.emailVerifications.map((item) => ({
    id: item.id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
    token: item.token,
    token_expired_at: toISOStringSafe(item.token_expired_at),
    verified_at:
      item.verified_at !== null ? toISOStringSafe(item.verified_at) : null,
  }));
  const convertedUserPasswordResets = user.userPasswordResets.map((item) => ({
    id: item.id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
    token: item.token,
    expires_at: toISOStringSafe(item.expires_at),
    requested_at: toISOStringSafe(item.requested_at),
  }));
  const convertedUserRoles = user.userRoles.map((role) => ({
    id: role.id,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
    deleted_at:
      role.deleted_at !== null ? toISOStringSafe(role.deleted_at) : null,
    description: role.description ?? undefined,
    status: role.status as "active" | "inactive" | "pending",
  }));
  const convertedSessions = user.sessions.map((session) => ({
    id: session.id,
    created_at: toISOStringSafe(session.created_at),
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    expired_at: toISOStringSafe(session.expired_at),
  }));
  const convertedTodoItems = user.todoItems.map((item) => ({
    id: item.id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
    description: item.description ?? undefined,
    title: item.title,
    status: item.status as "pending" | "completed" | "cancelled",
  }));
  const convertedAuditLogs = user.auditLogs.map((log) => ({
    id: log.id,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
    deleted_at:
      log.deleted_at !== null ? toISOStringSafe(log.deleted_at) : null,
    todo_app_todo_item_id: log.todo_app_todo_item_id,
    action: log.action,
  }));
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : null,
    accessTokens: convertedAccessTokens,
    refreshTokens: convertedRefreshTokens,
    emailVerifications: convertedEmailVerifications,
    userPasswordResets: convertedUserPasswordResets,
    userRoles: convertedUserRoles,
    sessions: convertedSessions,
    todoItems: convertedTodoItems,
    auditLogs: convertedAuditLogs,
    token,
  };
}
