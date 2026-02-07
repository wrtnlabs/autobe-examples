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
  const result = await MyGlobal.prisma.todo_app_todos.delete({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: { not: null },
    },
  });
  if (!result) {
    throw new HttpException("Todo not found or not in trash", 404);
  }
}
