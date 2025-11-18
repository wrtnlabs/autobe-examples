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

export async function putTodoListUserUsersSelf(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // 1. Enforce at least one field present for update
  if (!props.body.email && !props.body.password) {
    throw new HttpException(
      "At least one field (email or password) must be provided for update.",
      400,
    );
  }

  // 2. Locate the user. Ensure user exists and is not soft-deleted.
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found or account is deleted.", 404);
  }

  // 3. Prepare updateData object
  const updateData: {
    email?: string;
    password_hash?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.email) {
    updateData.email = props.body.email;
  }
  if (props.body.password) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }

  // 4. Try update (unique constraint handled by Prisma)
  let updated;
  try {
    updated = await MyGlobal.prisma.todo_list_users.update({
      where: { id: props.user.id },
      data: updateData,
    });
  } catch (err: any) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("email")) {
      throw new HttpException("Email address is already in use.", 409);
    }
    throw new HttpException("Failed to update user account.", 500);
  }

  // 5. Return API DTO (map fields, strict null/undefined handling)
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
