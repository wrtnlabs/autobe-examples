import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorCommentsCommentIdRestore(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment> {
  const { moderator, commentId } = props;

  // Fetch the comment to verify existence and deletion status
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: commentId },
    include: {
      post: true,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify comment is currently deleted
  if (!comment.deleted_at) {
    throw new HttpException("Comment is not deleted", 400);
  }

  // Verify moderator has permission for this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: comment.post.reddit_like_community_id,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Restore the comment by clearing deleted_at
  const restored = await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: null,
    },
  });

  // Return the restored comment with proper type conversions
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
