import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserUsersMe(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });
  if (user === null || user.deleted_at !== null) {
    throw new HttpException("User not found or deleted", 404);
  }

  // Prepare updated fields: Only display_name is mutable by users
  // Audit update timestamp
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      display_name: props.body.display_name,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    is_verified: updated.is_verified,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
