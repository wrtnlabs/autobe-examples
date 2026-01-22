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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: cannot update other user's account",
      403,
    );
  }
  const existing = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or deleted", 404);
  }
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: {
      // Use conditional spreads for optional fields with null support
      ...(typeof props.body.email !== "undefined" && {
        email: props.body.email,
      }),
      ...(typeof props.body.username !== "undefined" && {
        username: props.body.username,
      }),
      ...(props.body.bio !== undefined ? { bio: props.body.bio } : {}),
      ...(typeof props.body.expired_at !== "undefined" && {
        expired_at: props.body.expired_at,
      }),
      ...(props.body.avatar_url !== undefined
        ? { avatar_url: props.body.avatar_url }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Transform to ITodoAppUser by direct date conversion for updated_at and null for deleted_at
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    created_at: toISOStringSafe(updated.created_at),
    updated_at:
      updated.updated_at === null ? null : toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
    accessTokens: undefined,
    refreshTokens: undefined,
    emailVerifications: undefined,
    userPasswordResets: undefined,
    userRoles: undefined,
    sessions: undefined,
    todoItems: undefined,
    auditLogs: undefined,
  };
}
