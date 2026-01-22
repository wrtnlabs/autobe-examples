import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("User not found", 404);
  }
  await MyGlobal.prisma.todo_app_users.delete({
    where: {
      id: props.userId,
    },
  });
}
