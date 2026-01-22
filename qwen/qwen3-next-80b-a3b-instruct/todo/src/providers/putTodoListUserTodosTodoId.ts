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
import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoListTodoTransformer } from "../transformers/TodoListTodoTransformer";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Todo not found", 404);
  }
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.completed !== undefined && {
        completed: props.body.completed,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    ...TodoListTodoTransformer.select(),
  });
  return await TodoListTodoTransformer.transform(updated);
}
