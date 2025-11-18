import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  // Find the user to ensure existence and not already deleted
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  // Soft delete by setting deleted_at to ISO string
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Optionally, an audit log entry would be created by other means if required by audit policy.
}
