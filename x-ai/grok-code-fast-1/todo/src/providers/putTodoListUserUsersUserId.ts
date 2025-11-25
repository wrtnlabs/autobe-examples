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

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // 1. Fetch target user (ensure not soft-deleted)
  const dbUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (!dbUser) {
    throw new HttpException("User not found", 404);
  }
  // 2. Ownership check: users can only update themselves
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden: can only update own profile", 403);
  }

  // 3. Prepare patch: Only display_name, email
  const patch: { email?: string; display_name?: string; updated_at: string } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (
    typeof props.body.display_name !== "undefined" &&
    props.body.display_name !== dbUser.display_name
  ) {
    patch.display_name = props.body.display_name;
  }
  if (
    typeof props.body.email !== "undefined" &&
    props.body.email !== dbUser.email
  ) {
    // 4. Email uniqueness check
    const emailConflict = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.userId },
      },
    });
    if (emailConflict) {
      throw new HttpException("Email address already in use", 409);
    }
    patch.email = props.body.email;
  }
  // Must change at least one property
  if (Object.keys(patch).length === 1) {
    // only updated_at
    throw new HttpException("No updatable fields provided", 400);
  }

  // 5. Patch and reload updated record
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: patch,
  });
  const updated = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!updated) {
    throw new HttpException("User disappeared after update", 500);
  }

  // 6. Return DTO-mapped user (all date fields string, correct null/undefined handling for deleted_at)
  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...("deleted_at" in updated && updated.deleted_at !== null
      ? { deleted_at: toISOStringSafe(updated.deleted_at) }
      : {}),
  };
}
