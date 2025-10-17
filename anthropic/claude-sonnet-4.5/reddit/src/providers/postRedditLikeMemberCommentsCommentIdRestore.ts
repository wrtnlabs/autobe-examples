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

export async function postRedditLikeMemberCommentsCommentIdRestore(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment> {
  const { member, commentId } = props;

  // Fetch the comment to verify existence
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: commentId },
  });

  // Authorization: verify member owns this comment
  if (comment.reddit_like_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only restore your own comments",
      403,
    );
  }

  // Verify comment is currently deleted
  if (comment.deleted_at === null) {
    throw new HttpException(
      "Bad Request: Comment is not in deleted state",
      400,
    );
  }

  // Restore comment by clearing deleted_at timestamp
  const restored = await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return restored comment with proper type conversions
  return {
    id: restored.id,
    reddit_like_post_id: restored.reddit_like_post_id,
    reddit_like_parent_comment_id:
      restored.reddit_like_parent_comment_id === null
        ? undefined
        : restored.reddit_like_parent_comment_id,
    content_text: restored.content_text,
    depth: restored.depth,
    vote_score: restored.vote_score,
    edited: restored.edited,
    created_at: toISOStringSafe(restored.created_at),
    updated_at: toISOStringSafe(restored.updated_at),
  };
}
