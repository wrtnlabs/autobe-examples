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
  await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: props.todoId,
      user_id: props.user.id,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
      updated_at: new Date(),
    },
  });
}
