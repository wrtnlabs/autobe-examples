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

export async function postTodoAppUserUsersUserIdTodos(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const { user, userId, body } = props;

  // Authorization check - user can only create todos for themselves
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only create todos for your own account",
      403,
    );
  }

  // Verify user exists and is active
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
      status: "active",
    },
  });

  if (!existingUser) {
    throw new HttpException("User not found or inactive", 404);
  }

  const now = new Date();
  const todoId = v4();

  const createdTodo = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: todoId,
      todo_app_user_id: userId,
      title: body.title,
      status: "active",
      completed_at: null,
      created_at: now,
      updated_at: now,
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

  return {
    id: createdTodo.id as string & tags.Format<"uuid">,
    todo_app_user_id: createdTodo.todo_app_user_id as string &
      tags.Format<"uuid">,
    user: {
      id: createdTodo.user.id as string & tags.Format<"uuid">,
      email: createdTodo.user.email as string & tags.Format<"email">,
      status: createdTodo.user.status,
      created_at: toISOStringSafe(createdTodo.user.created_at),
      updated_at: toISOStringSafe(createdTodo.user.updated_at),
      deleted_at: createdTodo.user.deleted_at
        ? toISOStringSafe(createdTodo.user.deleted_at)
        : undefined,
    } satisfies ITodoAppUser.ISummary,
    title: createdTodo.title,
    status:
      createdTodo.status === "active" || createdTodo.status === "completed"
        ? createdTodo.status
        : "active",
    completed_at: createdTodo.completed_at
      ? toISOStringSafe(createdTodo.completed_at)
      : undefined,
    created_at: toISOStringSafe(createdTodo.created_at),
    updated_at: toISOStringSafe(createdTodo.updated_at),
    deleted_at: createdTodo.deleted_at
      ? toISOStringSafe(createdTodo.deleted_at)
      : undefined,
  };
}
