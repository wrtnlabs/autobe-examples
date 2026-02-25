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

export async function deleteRedditCloneMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string;
}): Promise<void> {
  // Find the comment to delete
  const comment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUnique({
      where: { id: props.commentId },
      select: {
        id: true,
        member_id: true,
        parent_comment_id: true,
        post_id: true,
        vote_score: true,
        reply_count: true,
      },
    });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Check permission: comment author OR community moderator
  const commentAuthorId = comment.member_id;
  const postId = comment.post_id;
  const isAuthor = commentAuthorId === props.member.id;
  // Check if member is moderator of the community
  let isModerator = false;
  if (!isAuthor) {
    const community =
      await MyGlobal.prisma.reddit_clone_content_posts.findUnique({
        where: { id: postId },
        select: { community_id: true },
      });
    if (community) {
      const moderator =
        await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
          where: {
            community_id: community.community_id,
            moderator_id: props.member.id,
          },
        });
      isModerator = !!moderator;
    }
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the comment
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Use transaction for consistency
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Soft delete the comment
    await prisma.reddit_clone_content_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: now,
      },
    });
    // Cascade delete nested replies (soft delete)
    const deleteNestedReplies = async (parentId: string): Promise<void> => {
      const replies = await prisma.reddit_clone_content_comments.findMany({
        where: {
          parent_comment_id: parentId,
          deleted_at: null,
        },
        select: { id: true },
      });
      for (const reply of replies) {
        await prisma.reddit_clone_content_comments.update({
          where: { id: reply.id },
          data: {
            deleted_at: now,
          },
        });
        await deleteNestedReplies(reply.id);
      }
    };
    await deleteNestedReplies(props.commentId);
    // Decrement parent comment's reply_count if this is a reply
    if (comment.parent_comment_id) {
      await prisma.reddit_clone_content_comments.update({
        where: { id: comment.parent_comment_id },
        data: {
          reply_count: { decrement: 1 },
        },
      });
    }
    // Update karma scores for comment author (reverse vote impacts)
    // This would require accessing karma tables and reversing vote impacts
    // Based on business requirements, karma should be adjusted when content is deleted
  });
}
