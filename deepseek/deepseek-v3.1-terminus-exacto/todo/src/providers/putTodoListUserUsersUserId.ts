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

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Step 1: Retrieve user, error if not found or soft-deleted
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or has been deleted", 404);
  }

  // Step 2: Auth - only allow update if user is updating self
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: cannot update another user's profile",
      403,
    );
  }

  // Step 3: Prepare update object
  const updateData: Record<string, unknown> = {};
  if (
    typeof props.body.email !== "undefined" &&
    props.body.email !== existing.email
  ) {
    // Check uniqueness
    const emailExists = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId },
        deleted_at: null,
      },
    });
    if (emailExists) {
      throw new HttpException("Email address already in use.", 409);
    }
    updateData.email = props.body.email;
  }
  if (typeof props.body.password !== "undefined") {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }
  if (typeof props.body.locked !== "undefined") {
    updateData.locked = props.body.locked;
  }
  if (Object.keys(updateData).length === 0) {
    // No fields were actually changed; skip DB update but must still audit
    updateData.updated_at = existing.updated_at;
  } else {
    updateData.updated_at = toISOStringSafe(new Date());
  }

  // Step 4: Perform the update
  const updated = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Step 5: Write audit log
  await MyGlobal.prisma.todo_list_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_action: "user_update",
      event_status: "success",
      actor_user_id: props.user.id,
      actor_admin_id: null,
      actor_user_session_id: props.user.session_id,
      actor_admin_session_id: null,
      affected_todo_id: null,
      event_context: JSON.stringify({
        updated_fields: Object.keys(updateData),
      }),
      ip_address: null,
      user_agent: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    locked: updated.locked,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at === null ? null : undefined,
  };
}
