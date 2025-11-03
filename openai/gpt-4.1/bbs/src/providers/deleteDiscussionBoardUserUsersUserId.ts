import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUser> {
  // 1. Ownership check: Only allow self-delete
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Users can only delete their own account.",
      403,
    );
  }

  // 2. Fetch the target user (not deleted or locked)
  const existing = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User is already deleted or does not exist.", 404);
  }
  if (existing.is_locked) {
    throw new HttpException("Cannot delete a locked account.", 403);
  }

  // 3. Anonymize: generate placeholder values
  // Deterministic anonymization: use opaque id-pointer and timestamp in email/display_name
  const deletionTime = toISOStringSafe(new Date());
  const anonymizedEmail = `${existing.id}@deleted.local`;
  const anonymizedDisplayName = `deleted-user-${existing.id.slice(0, 8)}`;

  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.userId },
    data: {
      email: anonymizedEmail,
      display_name: anonymizedDisplayName,
      avatar_url: null,
      deleted_at: deletionTime,
      updated_at: deletionTime,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    avatar_url: null,
    is_locked: updated.is_locked,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
