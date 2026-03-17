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
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment to verify existence and check it's not already deleted
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_community_members_id: true,
      deleted_at: true,
      reddit_community_posts_id: true,
    },
  });
  if (comment === null || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Get the post to check community for moderator permissions
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, community_id: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Verify ownership or moderator status
  const isOwner = comment.reddit_community_members_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        reddit_community_community_id: post.community_id,
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isOwner && isModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the comment
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: new Date() },
  });
  // Cascade delete all nested replies
  await cascadeDeleteComments(props.commentId);
  // Decrement post comment count
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: { comment_count: { decrement: 1 } },
  });
  // Record deletion in audit table
  await MyGlobal.prisma.reddit_community_comment_deletions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_comment_id: props.commentId,
      deleted_by_id: props.member.session_id,
      deleted_at: toISOStringSafe(new Date()),
      deletion_reason: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
async function cascadeDeleteComments(
  parentCommentId: string & tags.Format<"uuid">,
): Promise<void> {
  // Find all direct children
  const children = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: { parent_comment_id: parentCommentId, deleted_at: null },
    select: { id: true },
  });
  // Soft delete children and recurse
  for (const child of children) {
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: child.id },
      data: { deleted_at: new Date() },
    });
    // Recursively delete grandchildren
    await cascadeDeleteComments(child.id);
  }
}
