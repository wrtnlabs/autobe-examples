import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserUsersUserCode(props: {
  user: UserPayload;
  userCode: string;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: props.userCode,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Verify ownership: authenticated user must match target user
  if (user.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userCode },
    data: {
      email: props.body.email,
      password_hash: props.body.password_hash,
      deleted_at: props.body.deleted_at,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : (toISOStringSafe(updated.deleted_at) satisfies string as string),
  } satisfies ITodoAppUser;
}
