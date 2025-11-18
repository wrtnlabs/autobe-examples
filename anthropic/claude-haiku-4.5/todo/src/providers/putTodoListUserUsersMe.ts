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

export async function putTodoListUserUsersMe(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Step 1: Email uniqueness check
  if (props.body.email !== undefined) {
    const existing = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        NOT: { id: props.user.id },
      },
    });
    if (existing !== null) {
      throw new HttpException(
        "This email is already used by another account.",
        409,
      );
    }
  }

  // Step 2: Prepare update data
  const updateData: Record<string, unknown> = {};
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.password !== undefined) {
    const hashed = await PasswordUtil.hash(props.body.password);
    updateData.password_hash = hashed;
  }

  if (Object.keys(updateData).length === 0) {
    throw new HttpException("No update fields provided.", 400);
  }

  // Step 3: Update user row
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: updateData,
  });

  // Step 4: Return updated DTO
  return {
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
  };
}
