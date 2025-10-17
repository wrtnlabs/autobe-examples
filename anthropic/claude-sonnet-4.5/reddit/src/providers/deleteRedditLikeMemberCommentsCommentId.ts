import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditLikeMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, commentId } = props;

  // Fetch the comment to validate existence and ownership
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: commentId },
    select: {
      id: true,
      reddit_like_member_id: true,
      deleted_at: true,
    },
  });

  // Authorization check: Only the comment author can delete their own comment
  if (comment.reddit_like_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own comments",
      403,
    );
  }

  // Prevent redundant deletion attempts
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is already deleted", 400);
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
