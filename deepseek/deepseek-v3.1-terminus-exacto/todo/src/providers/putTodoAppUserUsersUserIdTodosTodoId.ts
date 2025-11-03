import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserUsersUserIdTodosTodoId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Verify user owns the todo
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.userId,
      deleted_at: null,
    },
  });

  // Build update data with proper status handling
  const now = toISOStringSafe(new Date());
  const updateData: any = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    updated_at: now,
  };

  // Handle status-dependent completed_at logic
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    if (props.body.status === "completed") {
      updateData.completed_at = now;
    } else if (props.body.status === "active") {
      updateData.completed_at = null;
    }
  }

  // Update the todo
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Fetch user details separately for better performance and clarity
  const user = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: props.userId },
  });

  // Build response with proper type conversion
  return {
    id: updated.id,
    todo_app_user_id: updated.todo_app_user_id,
    user: {
      id: user.id,
      email: user.email,
      status: user.status,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      ...(user.deleted_at !== null && {
        deleted_at: toISOStringSafe(user.deleted_at),
      }),
    },
    title: updated.title,
    status: updated.status as "active" | "completed",
    ...(updated.completed_at !== null && {
      completed_at: toISOStringSafe(updated.completed_at),
    }),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(updated.deleted_at !== null && {
      deleted_at: toISOStringSafe(updated.deleted_at),
    }),
  };
}
