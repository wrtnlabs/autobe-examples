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

export async function deleteTodoAppUserTrashesId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.id,
      deleted_at: { not: null },
      user_id: props.user.id,
    },
  });
  await MyGlobal.prisma.todo_app_histories.deleteMany({
    where: { todos_id: props.id },
  });
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.id },
  });
}
