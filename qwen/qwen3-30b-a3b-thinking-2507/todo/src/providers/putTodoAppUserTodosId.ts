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

export async function putTodoAppUserTodosId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.id },
    select: { user_id: true },
  });
  if (todo.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: {
    [k: string]: any;
  } = {};
  if (props.body.title !== undefined) updateData.title = props.body.title;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.start_date !== undefined)
    updateData.start_date = props.body.start_date
      ? new Date(props.body.start_date)
      : null;
  if (props.body.due_date !== undefined)
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  if (props.body.is_complete !== undefined)
    updateData.is_complete = props.body.is_complete;
  updateData.updated_at = new Date();
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.id },
    data: updateData,
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updatedTodo);
}
