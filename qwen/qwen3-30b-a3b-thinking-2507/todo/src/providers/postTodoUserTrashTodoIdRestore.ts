import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoTodoTransformer } from "../transformers/TodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoUserTrashTodoIdRestore(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: {
      id: props.todoId,
      todo_user_id: props.user.id,
      deleted_at: { not: null },
    },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_completed: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user: true,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or not in trash queue", 404);
  }
  const updated = await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return await TodoTodoTransformer.transform(updated);
}
