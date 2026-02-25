import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
}): Promise<void> {
  // Find the comment and verify it belongs to the post
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, author_id: true, post_id: true, deleted_at: true },
    });
  // Ensure comment belongs to the specified post
  if (comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Check if comment is already deleted
  if (comment.deleted_at !== null) {
    return; // Idempotent
  }
  // Verify if member is author
  const isAuthor = comment.author_id === props.member.id;
  if (!isAuthor) {
    // Check if member is a moderator of the post's community
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: props.postId },
        select: { community_id: true },
      },
    );
    const isModerator =
      await MyGlobal.prisma.reddit_community_moderators.findUnique({
        where: {
          user_id_community_id: {
            user_id: props.member.id,
            community_id: post.community_id,
          },
        },
      });
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Soft-delete the comment
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: now as string & tags.Format<"date-time">,
    },
  });
  // Decrement the post's comment_count
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: { decrement: 1 },
    },
  });
}
