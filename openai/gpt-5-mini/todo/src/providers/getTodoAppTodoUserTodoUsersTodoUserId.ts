import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserTodoUsersTodoUserId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoUser> {
  const { todoUser, todoUserId } = props;

  // Authorization: only the owner may access; admin actor not provided in props
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "Unauthorized: cannot view other user's profile",
      403,
    );
  }

  // Inline Prisma call - select only non-sensitive fields and include deleted_at for soft-delete check
  const user = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: todoUserId },
    select: {
      id: true,
      email: true,
      display_name: true,
      is_verified: true,
      status: true,
      mfa_enabled: true,
      failed_login_attempts: true,
      last_failed_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!user || user.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const response = {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    displayName: user.display_name ?? null,
    isVerified: user.is_verified,
    status: user.status,
    mfaEnabled: user.mfa_enabled,
    failedLoginAttempts: user.failed_login_attempts,
    lastFailedLoginAt: user.last_failed_login_at
      ? toISOStringSafe(user.last_failed_login_at)
      : null,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
  } satisfies ITodoAppTodoUser;

  return response;
}
