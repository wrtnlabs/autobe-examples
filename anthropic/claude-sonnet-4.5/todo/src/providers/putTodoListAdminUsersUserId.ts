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

export async function putTodoListAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  if (props.body.email !== undefined) {
    const emailConflict = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId },
        deleted_at: null,
      },
    });

    if (emailConflict) {
      throw new HttpException("Email already exists", 409);
    }
  }

  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: {
      updated_at: new Date(),
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
