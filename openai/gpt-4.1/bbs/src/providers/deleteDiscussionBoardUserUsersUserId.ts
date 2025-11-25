import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure only the owner can delete their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account.",
      403,
    );
  }

  // Attempt to find the user by id, must not be already deleted
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found or already deleted.", 404);
  }

  // Perform soft delete (set deleted_at to now)
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.userId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return on success
}
