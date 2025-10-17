import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAccountDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAccountDeletion";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserAuthUserAccount(props: {
  user: UserPayload;
}): Promise<ITodoListAccountDeletion.IResponse> {
  const { user } = props;

  // Check if user exists and is not already deleted
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
  });

  if (!existingUser) {
    throw new HttpException("User account not found or already deleted", 404);
  }

  // Prepare timestamps for soft delete
  const now = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Revoke all refresh tokens for this user to invalidate all sessions
  await MyGlobal.prisma.todo_list_refresh_tokens.updateMany({
    where: {
      todo_list_user_id: user.id,
      revoked_at: null,
    },
    data: {
      revoked_at: now,
    },
  });

  return {
    message:
      "Account successfully deleted. All associated data will be permanently removed after the grace period.",
  };
}
