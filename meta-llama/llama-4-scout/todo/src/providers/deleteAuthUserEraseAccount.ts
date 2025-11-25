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

export async function deleteAuthUserEraseAccount(props: {
  user: UserPayload;
}): Promise<ITodoListUser.IDeletionResult> {
  // Get current timestamp as string for all operations
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Check the user exists, is not already deleted
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.user.id,
      is_active: true,
      is_verified: true,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found or already deleted.", 404);
  }

  // Transactional, cascading annihilation of all user data
  await MyGlobal.prisma.$transaction([
    // Delete all todos
    MyGlobal.prisma.todo_list_todos.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Remove all sessions
    MyGlobal.prisma.todo_list_user_sessions.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Delete all verifications
    MyGlobal.prisma.todo_list_user_email_verifications.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Delete all password resets
    MyGlobal.prisma.todo_list_user_password_resets.deleteMany({
      where: { todo_list_user_id: props.user.id },
    }),
    // Soft-delete the user entity
    MyGlobal.prisma.todo_list_users.update({
      where: { id: props.user.id },
      data: { is_active: false, deleted_at: now, updated_at: now },
    }),
  ]);

  // All data is now unrecoverably erased
  return { success: true };
}
