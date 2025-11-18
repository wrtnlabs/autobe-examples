import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function putTodoListUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // 1. Get the user by ID
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing) {
    throw new HttpException("User not found", 404);
  }

  // 2. If updating email, check for global uniqueness
  let updatePayload: Record<string, unknown> = {};
  if (
    typeof props.body.email === "string" &&
    props.body.email !== existing.email
  ) {
    const emailExists = await MyGlobal.prisma.todo_list_users.findFirst({
      where: { email: props.body.email },
    });
    if (emailExists) {
      throw new HttpException("Email already in use", 409);
    }
    updatePayload.email = props.body.email;
  }

  // 3. Update disabled_at if specified
  if (Object.prototype.hasOwnProperty.call(props.body, "disabled_at")) {
    updatePayload.disabled_at =
      props.body.disabled_at === undefined
        ? null // clear if unset
        : props.body.disabled_at;
  }

  // 4. Always update updated_at
  updatePayload.updated_at = toISOStringSafe(new Date());

  // 5. Update record in database
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updatePayload,
  });

  // 6. Return mapped result, honoring optional/nullable typing
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    disabled_at:
      typeof updated.disabled_at === "undefined" || updated.disabled_at === null
        ? undefined
        : toISOStringSafe(updated.disabled_at),
  };
}
