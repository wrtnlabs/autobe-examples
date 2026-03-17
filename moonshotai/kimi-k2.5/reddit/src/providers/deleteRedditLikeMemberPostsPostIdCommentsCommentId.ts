import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberPostsPostIdCommentsCommentId(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find comment and verify it exists and belongs to the post
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      post_id: true,
      author_id: true,
      is_deleted: true,
    },
  });
  // Check if comment exists
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
  // Check if member is the author
  const isAuthor = comment.author_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    // Get the community_id from the post
    const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
      where: { id: props.postId },
      select: { community_id: true },
    });
    if (post === null) {
      throw new HttpException("Post not found", 404);
    }
    // Check if member is a moderator of this community
    const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: post.community_id,
        deleted_at: null,
      },
    });
    isModerator = moderator !== null;
  }
  // Must be either author or moderator
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the comment
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      is_deleted: true,
      updated_at: new Date(),
    },
  });
}
