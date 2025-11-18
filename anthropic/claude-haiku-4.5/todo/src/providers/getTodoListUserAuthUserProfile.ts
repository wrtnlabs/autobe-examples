import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserAuthUserProfile(props: {
  user: UserPayload;
}): Promise<ITodoListUser> {
  const userRecord = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
  });

  if (!userRecord || userRecord.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: userRecord.id,
    email: userRecord.email,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
    deleted_at: userRecord.deleted_at
      ? toISOStringSafe(userRecord.deleted_at)
      : null,
    last_login_at: userRecord.last_login_at
      ? toISOStringSafe(userRecord.last_login_at)
      : null,
  };
}
