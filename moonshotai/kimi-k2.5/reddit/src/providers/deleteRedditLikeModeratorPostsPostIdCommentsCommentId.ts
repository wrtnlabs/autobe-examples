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
  // Fetch comment with post info to verify ownership and get community
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
  // Check if user is the author
  const isAuthor = comment.author_id === props.moderator.id;
  // If not author, check if moderator of the community
  if (!isAuthor) {
    // Get the community_id from the post
    const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
      where: { id: props.postId },
      select: { community_id: true },
    });
    if (post === null) {
      throw new HttpException("Post not found", 404);
    }
    // Check if user is a moderator of this community
    const moderatorRecord =
      await MyGlobal.prisma.reddit_like_moderators.findFirst({
        where: {
          member_id: props.moderator.id,
          community_id: post.community_id,
          deleted_at: null,
        },
      });
    if (moderatorRecord === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Perform soft delete
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      is_deleted: true,
      updated_at: new Date(),
    },
  });
}
