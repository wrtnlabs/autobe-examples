import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function postMultiUserTodoUserTrashTodoIdErase(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: { id: props.todoId },
    select: { multi_user_todo_user_id: true, deleted_at: true },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.multi_user_todo_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.multi_user_todo_todo_edit_histories.deleteMany({
      where: { multi_user_todo_todo_id: props.todoId },
    });
    await tx.multi_user_todo_todos.delete({
      where: { id: props.todoId },
    });
  });
}
