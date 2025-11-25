import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the target comment to verify existence and ownership
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, user_id: true, deleted_at: true },
  });

  if (!comment) {
    throw new HttpException("Comment not found.", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has already been deleted.", 404);
  }
  if (comment.user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to delete this comment.",
      403,
    );
  }

  // 2. Permanently DELETE (hard delete) the comment record
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });

  // 3. All subsidiary data handling is performed by DB referential integrity (cascade/on delete)
}
