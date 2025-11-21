import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserUsersUserIdTodos(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserTodo.ICreate;
}): Promise<ITodoListUserTodo> {
  // Security check: user can only create todos for themselves
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot create todo for another user",
      403,
    );
  }

  // Create the new todo item
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.userId,
      title: props.body.title,
      completed: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the created todo in the correct DTO format
  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    title: created.title,
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: undefined,
  };
}
