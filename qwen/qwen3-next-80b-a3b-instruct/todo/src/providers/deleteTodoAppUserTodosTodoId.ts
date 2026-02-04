import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<void> {
  // Validate todo exists and belongs to user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      user: { id: props.user.id },
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  // Delete todo only - edit_histories table does not exist
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
