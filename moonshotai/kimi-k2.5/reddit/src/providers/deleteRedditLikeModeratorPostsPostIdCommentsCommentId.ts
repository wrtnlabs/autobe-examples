import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find comment and verify it belongs to the post
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true,
      is_deleted: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 404);
  }
  // Check if already deleted
  if (comment.is_deleted) {
    throw new HttpException("Comment not found", 404);
  }
  // Get post to find community
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Verify moderator has privileges for this community
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: post.community_id,
      deleted_at: null,
    },
  });
  if (moderator === null) {
    throw new HttpException(
      "Forbidden - not a moderator of this community",
      403,
    );
  }
  // Soft delete the comment - use ISO string timestamp
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      is_deleted: true,
      updated_at: now,
    },
  });
}
