import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putAuthTodoUserPassword(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTodoUser.IChangePassword;
}): Promise<ITodoAppTodoUser.ISummary> {
  const { todoUser, body } = props;
  const { currentPassword, newPassword } = body;

  // Load the current user (ensures actor owns the account via todoUser.id)
  const user = await MyGlobal.prisma.todo_app_todouser.findUniqueOrThrow({
    where: { id: todoUser.id },
  });

  // Verify provided current password matches stored hash
  const verified = await PasswordUtil.verify(
    currentPassword,
    user.password_hash,
  );
  if (!verified) throw new HttpException("Current password is incorrect", 403);

  // Prepare new hash and a single timestamp value
  const newHashed = await PasswordUtil.hash(newPassword);
  const now = toISOStringSafe(new Date());

  // Update credentials and revoke prior refresh tokens
  const updated = await MyGlobal.prisma.todo_app_todouser.update({
    where: { id: todoUser.id },
    data: {
      password_hash: newHashed,
      refresh_tokens_revoked_at: now,
      updated_at: now,
    },
  });

  // Record a user activity log for auditing
  await MyGlobal.prisma.todo_app_user_activity_logs.create({
    data: {
      id: v4(),
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      activity_type: "change_password",
      details: "User changed password",
      created_at: now,
      updated_at: now,
    },
  });

  // Map Prisma result to API DTO, converting Date -> ISO strings
  return {
    id: updated.id,
    displayName: updated.display_name ?? null,
    isVerified: updated.is_verified,
    status: updated.status,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
