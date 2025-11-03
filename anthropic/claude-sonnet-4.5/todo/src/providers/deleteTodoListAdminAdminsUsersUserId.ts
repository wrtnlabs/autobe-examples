import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  const { userId } = props;

  // Verify user exists before attempting soft delete
  await MyGlobal.prisma.todo_list_users.findUniqueOrThrow({
    where: { id: userId },
  });

  // Prepare timestamp once for both update and return
  const now = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at timestamp
  const deletedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: userId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Return complete user object with converted timestamps
  return {
    id: deletedUser.id,
    email: deletedUser.email,
    created_at: toISOStringSafe(deletedUser.created_at),
    updated_at: now,
    deleted_at: now,
  };
}
