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

export async function postAuthUserRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "user";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "user";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  const sessionRaw = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id,
    },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      todoAppUser: true,
    },
  });
  if (!sessionRaw || !sessionRaw.todoAppUser) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const user = sessionRaw.todoAppUser;
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = new Date();
  const accessExpiresTimestamp = now.getTime() + 60 * 60 * 1000;
  const refreshExpiresTimestamp = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(refreshExpiresTimestamp));
  const createdAtString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAtString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAtString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresString },
  });
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    created_at: toISOStringSafe(user.created_at),
    updated_at:
      user.updated_at !== null && user.updated_at !== undefined
        ? toISOStringSafe(user.updated_at)
        : null,
    deleted_at:
      user.deleted_at !== null && user.deleted_at !== undefined
        ? toISOStringSafe(user.deleted_at)
        : null,
    accessTokens: undefined,
    refreshTokens: undefined,
    emailVerifications: undefined,
    userPasswordResets: undefined,
    userRoles: undefined,
    sessions: undefined,
    todoItems: undefined,
    auditLogs: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
      token: true,
      type: "bearer",
      issued_at: createdAtString,
    },
  };
}
