import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditLikeMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IUpdate;
}): Promise<IRedditLikeComment> {
  const { member, commentId, body } = props;

  // Fetch the comment to verify it exists and get ownership/edit window info
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: commentId },
  });

  // Authorization check: Verify the authenticated member is the comment author
  if (comment.reddit_like_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only edit your own comments",
      403,
    );
  }

  // Verify comment is not soft-deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted comment", 400);
  }

  // Enforce 24-hour edit window using timestamp arithmetic
  const currentTimestamp = Date.now();
  const createdAtTimestamp = new Date(comment.created_at).getTime();
  const hoursSinceCreation =
    (currentTimestamp - createdAtTimestamp) / (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    throw new HttpException(
      "Comment can only be edited within 24 hours of creation",
      400,
    );
  }

  // Update the comment with new content and set edited flag
  const updated = await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
    data: {
      content_text: body.content_text ?? undefined,
      edited: true,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated comment with proper date conversions
  return {
    id: updated.id,
    reddit_like_post_id: updated.reddit_like_post_id,
    reddit_like_parent_comment_id:
      updated.reddit_like_parent_comment_id === null
        ? undefined
        : updated.reddit_like_parent_comment_id,
    content_text: updated.content_text,
    depth: updated.depth,
    vote_score: updated.vote_score,
    edited: updated.edited,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
