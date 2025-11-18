import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoUser> {
  // Only allow if the authenticated user is the same as the user being deleted
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You may only delete your own account.",
      403,
    );
  }

  // Find the user, ensure not already deleted
  const existing = await MyGlobal.prisma.todo_user.findUnique({
    where: { id: props.userId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or already deleted.", 404);
  }

  // Generate deletion timestamp (must use toISOStringSafe for compliance)
  const deletionTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const updated = await MyGlobal.prisma.todo_user.update({
    where: { id: props.userId },
    data: { deleted_at: deletionTime },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
