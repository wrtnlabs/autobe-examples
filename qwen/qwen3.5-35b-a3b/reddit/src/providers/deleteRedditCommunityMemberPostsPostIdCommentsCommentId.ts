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
  // Step 1: Verify comment exists, get its details, and confirm it belongs to the post
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_community_members_id: true,
        reddit_community_posts_id: true,
        parent_comment_id: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            community_id: true,
          },
        },
      },
    });
  // Verify comment belongs to the specified post
  if (comment.reddit_community_posts_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 2: Check if comment is already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 3: Authorization check - owner or moderator
  const isOwner = comment.reddit_community_members_id === props.member.id;
  if (!isOwner) {
    // Check if member is moderator in post's community
    const isModerator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          reddit_community_moderator_id: props.member.id,
          reddit_community_community_id: comment.post.community_id,
          deleted_at: null,
        },
      });
    if (isModerator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Get all nested replies (excluding the comment itself)
  // Use recursive CTE or multiple queries to find all descendants
  const getAllNestedReplies = async (
    parentId: string,
  ): Promise<
    Array<{
      id: string;
    }>
  > => {
    const replies = await MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        reddit_community_posts_id: comment.reddit_community_posts_id,
        parent_comment_id: parentId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    let allReplies = replies;
    for (const reply of replies) {
      const deeperReplies = await getAllNestedReplies(reply.id);
      allReplies = allReplies.concat(deeperReplies);
    }
    return allReplies;
  };
  const nestedReplies = await getAllNestedReplies(props.commentId);
  // Step 5: Get vote records for this comment (vote table has no soft delete field)
  const votes =
    await MyGlobal.prisma.reddit_community_vote_of_comments.findMany({
      where: {
        comment_id: props.commentId,
      },
      select: {
        id: true,
      },
    });
  // Step 6: Execute deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Set deleted_at on main comment (soft delete)
    await tx.reddit_community_comments.update({
      where: { id: props.commentId },
      data: {
        deleted_at: new Date(),
      },
    });
    // Cascade soft delete nested replies (set deleted_at on each)
    for (const reply of nestedReplies) {
      await tx.reddit_community_comments.update({
        where: { id: reply.id },
        data: {
          deleted_at: new Date(),
        },
      });
    }
    // Delete vote records targeting this comment
    for (const vote of votes) {
      await tx.reddit_community_vote_of_comments.delete({
        where: { id: vote.id },
      });
    }
    // Decrement post's comment_count
    await tx.reddit_community_posts.update({
      where: { id: comment.reddit_community_posts_id },
      data: {
        comment_count: {
          decrement: 1,
        },
      },
    });
    // Record audit deletion
    await tx.reddit_community_comment_deletions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_comment_id: props.commentId,
        deleted_by_id: props.member.id,
        deleted_at: new Date(),
        deletion_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
