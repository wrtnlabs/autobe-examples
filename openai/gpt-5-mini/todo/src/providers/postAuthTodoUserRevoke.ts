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

export async function postAuthTodoUserRevoke(props: {
  todoUser: TodouserPayload;
}): Promise<ITodoAppTodoUser.ISummary> {
  const { todoUser } = props;

  // Verify the authenticated user exists and is active
  const found = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: todoUser.id },
  });

  if (!found) {
    throw new HttpException("Not Found", 404);
  }

  if (found.deleted_at !== null || found.status !== "active") {
    throw new HttpException("Unauthorized: inactive account", 403);
  }

  // Prepare timestamp (ISO string) for DB writes and responses
  const now = toISOStringSafe(new Date());

  try {
    const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
      const updatedUser = await prisma.todo_app_todouser.update({
        where: { id: todoUser.id },
        data: {
          refresh_tokens_revoked_at: now,
          updated_at: now,
        },
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      });

      await prisma.todo_app_user_activity_logs.create({
        data: {
          id: v4(),
          todo_app_todouser_id: todoUser.id,
          activity_type: "revoke_refresh_tokens",
          details: null,
          ip: null,
          href: null,
          created_at: now,
          updated_at: now,
        },
      });

      return updatedUser;
    });

    return {
      id: updated.id,
      displayName: updated.display_name ?? null,
      isVerified: updated.is_verified,
      status: updated.status,
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: toISOStringSafe(updated.updated_at),
    };
  } catch (err) {
    // Unexpected errors are surfaced as 500 for the client
    throw new HttpException("Internal Server Error", 500);
  }
}
