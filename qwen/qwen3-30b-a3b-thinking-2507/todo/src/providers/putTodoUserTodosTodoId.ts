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

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  const select = TodoTodoTransformer.select();
  const todo = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      todo_user_id: props.user.id,
      deleted_at: null,
    },
    ...select,
  });
  if (!todo) {
    throw new HttpException("Todo not found or deleted", 404);
  }
  if (props.body.start_date && props.body.due_date) {
    const startDate = new Date(props.body.start_date);
    const dueDate = new Date(props.body.due_date);
    if (startDate > dueDate) {
      throw new HttpException("Start date cannot be after due date", 400);
    }
  }
  const updateData = {
    title: props.body.title,
    description: props.body.description ?? null,
    start_date: props.body.start_date ?? null,
    due_date: props.body.due_date ?? null,
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedTodo = await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: updateData,
    ...select,
  });
  return await TodoTodoTransformer.transform(updatedTodo);
}
