import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosIdComplete(props: {
  user: UserPayload;
  id: string;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.id,
      user_id: props.user.id,
    },
  });
  const isComplete = !todo.is_complete;
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.id },
    data: {
      is_complete: isComplete,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.todo_app_histories.create({
    data: {
      id: v4(),
      todos_id: props.id,
      timestamp: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const fullTodo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.id },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(fullTodo);
}
