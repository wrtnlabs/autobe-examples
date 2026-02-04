import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify that the authenticated user matches the userId parameter
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden - User matching account ID is required",
      403,
    );
  }
  // Soft delete user account
  await MyGlobal.prisma.todo_users.update({
    where: { id: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Soft delete all associated data across related tables
  await MyGlobal.prisma.todo_todos.updateMany({
    where: { userId: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.todo_histories.updateMany({
    where: { userId: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.todo_user_sessions.updateMany({
    where: { userId: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.todo_user_email_verifications.updateMany({
    where: { userId: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.todo_user_password_resets.updateMany({
    where: { userId: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
