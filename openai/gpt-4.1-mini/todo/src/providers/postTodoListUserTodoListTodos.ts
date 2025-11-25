import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodoListTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4(),
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      is_complete: props.body.isComplete,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    todoListUserId: created.todo_list_user_id as string & tags.Format<"uuid">,
    title: created.title,
    description: created.description ?? undefined,
    isComplete: created.is_complete,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
