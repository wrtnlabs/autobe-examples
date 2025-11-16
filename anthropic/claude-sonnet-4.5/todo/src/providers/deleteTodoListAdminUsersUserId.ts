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

export async function deleteTodoListAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  const deletedUser = await MyGlobal.prisma.todo_list_users.delete({
    where: { id: props.userId },
  });

  return {
    id: deletedUser.id,
    email: deletedUser.email,
    email_verified: deletedUser.email_verified,
    created_at: toISOStringSafe(deletedUser.created_at),
    updated_at: toISOStringSafe(deletedUser.updated_at),
    deleted_at: deletedUser.deleted_at
      ? toISOStringSafe(deletedUser.deleted_at)
      : null,
  };
}
