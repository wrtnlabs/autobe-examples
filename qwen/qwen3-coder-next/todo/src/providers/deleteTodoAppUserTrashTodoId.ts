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

export async function deleteTodoAppUserTrashTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      is_deleted: true,
    },
  });
  if (todo === null) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_todos.delete({
      where: { id: props.todoId },
    }),
    MyGlobal.prisma.todo_app_todo_histories.deleteMany({
      where: { todo_id: props.todoId },
    }),
  ]);
}
