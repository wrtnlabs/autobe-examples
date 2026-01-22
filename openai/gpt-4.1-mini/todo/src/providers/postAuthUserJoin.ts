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

export async function postAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  const now = toISOStringSafe(new Date());
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const userCreateInput = {
    id: v4(),
    email: props.body.email,
    username: props.body.email, // username duplicate of email as schema requires
    password_hash: hashedPassword,
    created_at: now,
    updated_at: now,
  } satisfies Prisma.todo_app_usersCreateInput;
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: userCreateInput,
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionCreateInput = {
    id: v4(),
    todoAppUser: { connect: { id: user.id } },
    ip: props.body.ip ?? "0.0.0.0",
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: toISOStringSafe(accessExpires),
  } satisfies Prisma.todo_app_user_sessionsCreateInput;
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: sessionCreateInput,
  });
  const nowIso = toISOStringSafe(new Date());
  const token: ITodoAppAccessToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
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
        type: "user",
        id: user.id,
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
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
    token: true,
    type: true,
    issued_at: true,
    revoked_at: null,
    todo_app_user_id: user.id,
    todo_app_guest_id: null,
    todo_app_user_session_id: session.id,
  };
  return {
    id: user.id,
    email: user.email,
    username: user.email,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    accessTokens: undefined,
    refreshTokens: undefined,
    emailVerifications: undefined,
    userPasswordResets: undefined,
    userRoles: undefined,
    sessions: undefined,
    todoItems: undefined,
    auditLogs: undefined,
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
