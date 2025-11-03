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

export async function putTodoAppTodoUserTodoUsersTodoUserId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  body: ITodoAppTodoUser.IUpdate;
}): Promise<ITodoAppTodoUser> {
  const { todoUser, todoUserId, body } = props;

  // Authorization: only the owner may update their profile
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Ensure the target exists and is not soft-deleted
  const existing = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
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

  if (existing.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Prepare ISO timestamp once and reuse
  const now = toISOStringSafe(new Date());

  try {
    const updated = await MyGlobal.prisma.todo_app_todouser.update({
      where: { id: todoUserId },
      data: {
        // Only include properties present in the DTO
        ...(body.email !== undefined && { email: body.email }),
        // displayName is optional and nullable: if undefined => skip; otherwise set (can be null to clear)
        ...(body.displayName === undefined
          ? {}
          : { display_name: body.displayName }),
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      email: updated.email as string & tags.Format<"email">,
      displayName:
        updated.display_name === null
          ? null
          : (updated.display_name ?? undefined),
      isVerified: updated.is_verified,
      status: updated.status,
      mfaEnabled: updated.mfa_enabled,
      failedLoginAttempts: updated.failed_login_attempts ?? undefined,
      lastFailedLoginAt: updated.last_failed_login_at
        ? toISOStringSafe(updated.last_failed_login_at)
        : null,
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: now,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict: Email already in use", 400);
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
