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
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoTodoTransformer } from "../transformers/TodoTodoTransformer";

export async function getTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<ITodoTodo> {
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
    ...TodoTodoTransformer.select(),
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.user?.id !== props.user.id) {
    throw new HttpException("Unauthorized - You don't own this todo", 403);
  }
  return await TodoTodoTransformer.transform(todo);
}
