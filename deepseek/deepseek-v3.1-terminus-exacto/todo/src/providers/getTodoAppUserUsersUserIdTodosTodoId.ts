import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserIdTodosTodoId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const { user, userId, todoId } = props;

  // Verify the authenticated user can only access their own resources
  if (user.id !== userId) {
    throw new HttpException("You can only access your own todos", 403);
  }

  // Verify the user exists and is active
  const userRecord = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
      status: "active",
    },
  });

  if (!userRecord) {
    throw new HttpException("User not found or inactive", 404);
  }

  // Verify the todo exists and belongs to the authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: todoId,
      todo_app_user_id: userId,
      deleted_at: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Convert all date fields to ISO strings
  const userSummary = {
    id: todo.user.id as string & tags.Format<"uuid">,
    email: todo.user.email as string & tags.Format<"email">,
    status: todo.user.status,
    created_at: toISOStringSafe(todo.user.created_at),
    updated_at: toISOStringSafe(todo.user.updated_at),
    deleted_at: todo.user.deleted_at
      ? toISOStringSafe(todo.user.deleted_at)
      : undefined,
  } satisfies ITodoAppUser.ISummary;

  return {
    id: todo.id as string & tags.Format<"uuid">,
    todo_app_user_id: todo.todo_app_user_id as string & tags.Format<"uuid">,
    user: userSummary,
    title: todo.title,
    status: todo.status as ITodoAppTodoStatus,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
  } satisfies ITodoAppTodo;
}
