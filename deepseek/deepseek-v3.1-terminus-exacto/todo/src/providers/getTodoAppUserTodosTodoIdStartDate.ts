import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStartDateField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStartDateField";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoStartDateFieldTransformer } from "../transformers/TodoAppTodoStartDateFieldTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdStartDate(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoStartDateField> {
  // First verify the todo exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  // Retrieve the start date field record
  const startDateField =
    await MyGlobal.prisma.todo_app_todo_start_date_fields.findUnique({
      where: { todo_app_todo_id: props.todoId },
      ...TodoAppTodoStartDateFieldTransformer.select(),
    });
  if (!startDateField) {
    throw new HttpException("Start date field not found", 404);
  }
  return await TodoAppTodoStartDateFieldTransformer.transform(startDateField);
}
