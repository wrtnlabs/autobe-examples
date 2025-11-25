import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check for existence and already-deleted status
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or already deleted", 404);
  }
  // Mark as soft deleted with current ISO string -- no native Date type anywhere
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
