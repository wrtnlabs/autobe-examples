import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITOdoAppTodoDescriptionField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITOdoAppTodoDescriptionField";
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
import { TOdoAppTodoDescriptionFieldTransformer } from "../transformers/TOdoAppTodoDescriptionFieldTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdDescription(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITOdoAppTodoDescriptionField> {
  // Verify the todo exists and belongs to the authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Retrieve the description field for this todo
  const descriptionField =
    await MyGlobal.prisma.todo_app_todo_description_fields.findUnique({
      where: {
        todo_app_todo_id: props.todoId,
      },
      ...TOdoAppTodoDescriptionFieldTransformer.select(),
    });
  if (!descriptionField) {
    throw new HttpException("Description field not found for this todo", 404);
  }
  return await TOdoAppTodoDescriptionFieldTransformer.transform(
    descriptionField,
  );
}
