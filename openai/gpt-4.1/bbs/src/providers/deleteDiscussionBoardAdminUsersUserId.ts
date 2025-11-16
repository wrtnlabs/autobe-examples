import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUser> {
  // Step 1: Find and validate user existence
  const userRecord = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId },
  });
  if (userRecord === null) {
    throw new HttpException("User not found", 404);
  }
  if (userRecord.deleted_at !== null) {
    throw new HttpException("User has already been deleted", 400);
  }

  // Step 2: Soft delete the user
  const deletedAt = toISOStringSafe(new Date());
  const updatedUser = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.userId },
    data: {
      deleted_at: deletedAt,
      is_active: false,
      updated_at: deletedAt,
    },
  });

  // Step 3: Invalidate all active user sessions (set expired_at if not already set)
  await MyGlobal.prisma.discussion_board_user_sessions.updateMany({
    where: {
      discussion_board_user_id: props.userId,
      expired_at: null,
    },
    data: {
      expired_at: deletedAt,
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    is_email_verified: updatedUser.is_email_verified,
    is_active: updatedUser.is_active,
    is_blocked: updatedUser.is_blocked,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at:
      updatedUser.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedUser.deleted_at),
  };
}
