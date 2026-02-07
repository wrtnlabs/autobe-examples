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

export async function deleteTodoAppUserTrashTrashId(props: {
  user: UserPayload;
  trashId: string;
}): Promise<void> {
  const trashEntry = await MyGlobal.prisma.todo_app_todo_trashes.findUnique({
    where: {
      id: props.trashId,
      user_id: props.user.id,
    },
  });
  if (!trashEntry) {
    throw new HttpException("Trash entry not found", 404);
  }
  await MyGlobal.prisma.todo_app_todo_trashes.delete({
    where: { id: props.trashId },
  });
}
