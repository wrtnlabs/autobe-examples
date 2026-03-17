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

export async function deleteRedditCloneMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify comment exists, belongs to post, and is not already deleted
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
        deleted_at: true,
      },
    },
  );
  // Verify comment belongs to the specified post
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Verify comment is not already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is already deleted", 410);
  }
  // Step 2: Check authorization - comment author OR community moderator
  const isAuthor = comment.reddit_clone_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    // Get the post to find the community
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
      },
    });
    // Check if member is a moderator of the community
    const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
      where: {
        community_id: post.community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
    isModerator = moderator !== null;
  }
  // Authorization check
  if (!isAuthor && !isModerator) {
    throw new HttpException(
      "Forbidden: You can only delete your own comments or moderate comments in your community",
      403,
    );
  }
  // Step 3: Soft delete the comment and cascade to children
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Soft delete the target comment
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Cascade soft delete to all child comments (nested replies) recursively
  const deleteChildComments = async (parentId: string): Promise<void> => {
    const children = await MyGlobal.prisma.reddit_clone_comments.findMany({
      where: {
        parent_comment_id: parentId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (children.length > 0) {
      await MyGlobal.prisma.reddit_clone_comments.updateMany({
        where: {
          parent_comment_id: parentId,
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
      // Recursively delete grandchildren
      for (const child of children) {
        await deleteChildComments(child.id);
      }
    }
  };
  await deleteChildComments(props.commentId);
  // Step 4: Update author's karma score by removing vote contributions
  // Calculate total vote impact on the deleted comment
  const votes = await MyGlobal.prisma.reddit_clone_votes.findMany({
    where: {
      target_type: "COMMENT",
      target_id: props.commentId,
      deleted_at: null,
    },
    select: {
      vote_type: true,
    },
  });
  let karmaImpact = 0;
  for (const vote of votes) {
    if (vote.vote_type === "UPVOTE") {
      karmaImpact += 1;
    } else if (vote.vote_type === "DOWNVOTE") {
      karmaImpact -= 1;
    }
  }
  // Update the author's karma score (subtract the impact since comment is deleted)
  if (karmaImpact !== 0) {
    await MyGlobal.prisma.reddit_clone_karma_scores.update({
      where: {
        member_id: comment.reddit_clone_member_id,
      },
      data: {
        score: {
          decrement: karmaImpact,
        },
        updated_at: now,
      },
    });
  }
}
