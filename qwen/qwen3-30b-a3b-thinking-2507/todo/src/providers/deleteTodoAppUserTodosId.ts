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

export async function deleteTodoAppUserTodosId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.id,
      user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.id },
    data: { deleted_at: new Date() },
  });
}
