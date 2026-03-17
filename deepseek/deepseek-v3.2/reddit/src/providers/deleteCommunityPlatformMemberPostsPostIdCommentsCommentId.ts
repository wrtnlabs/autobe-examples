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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for atomic operations
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Step 1: Verify post exists and is not deleted
    const post = await prisma.community_platform_posts.findUniqueOrThrow({
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    });
    // Step 2: Verify comment exists and is not already deleted
    const comment = await prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
      },
      select: {
        id: true,
        member_id: true,
        post_id: true,
        deleted_at: true,
        author: {
          select: { id: true },
        },
      },
    });
    // Check if comment already deleted
    if (comment.deleted_at !== null) {
      throw new HttpException("Comment already deleted", 410);
    }
    // Verify comment belongs to the specified post
    if (comment.post_id !== props.postId) {
      throw new HttpException("Comment does not belong to specified post", 404);
    }
    // Step 3 & 4: Check authorization
    const isAuthor = comment.member_id === props.member.id;
    let isModerator = false;
    if (!isAuthor) {
      // Check if member is moderator or owner in the community
      const moderationRole =
        await prisma.community_platform_moderation_roles.findFirst({
          where: {
            community_platform_member_id: props.member.id,
            community_platform_community_id:
              post.community_platform_community_id,
            role_type: { in: ["owner", "moderator"] },
            deleted_at: null,
          },
        });
      isModerator = moderationRole !== null;
    }
    // Step 5: Reject if not authorized
    if (!isAuthor && !isModerator) {
      throw new HttpException("Forbidden", 403);
    }
    const now = new Date();
    // Step 6: Cascade delete replies (soft delete)
    const replyCount = await prisma.community_platform_comments.count({
      where: {
        parent_comment_id: props.commentId,
        deleted_at: null,
      },
    });
    if (replyCount > 0) {
      await prisma.community_platform_comments.updateMany({
        where: {
          parent_comment_id: props.commentId,
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
    }
    // Step 7: Adjust karma for comment author
    // Find all votes on the comment and its replies
    const votes = await prisma.community_platform_comment_votes.findMany({
      where: {
        OR: [
          { community_platform_comment_id: props.commentId },
          { comment: { parent_comment_id: props.commentId } },
        ],
        deleted_at: null,
      },
      select: {
        type: true,
      },
    });
    // Calculate karma change:
    // - Removing an upvote: -1 karma (author loses the benefit)
    // - Removing a downvote: +1 karma (author gains back the lost karma)
    let karmaChange = 0;
    for (const vote of votes) {
      if (vote.type === "upvote") {
        karmaChange -= 1; // Removing upvote reduces karma
      } else if (vote.type === "downvote") {
        karmaChange += 1; // Removing downvote increases karma
      }
    }
    // Update author's karma if there's a change
    if (karmaChange !== 0) {
      await prisma.community_platform_karmas.update({
        where: {
          member_id: comment.member_id,
        },
        data: {
          score: {
            increment: karmaChange,
          },
          updated_at: now,
        },
      });
    }
    // Step 8: Update the comment's deleted_at (soft delete)
    await prisma.community_platform_comments.update({
      where: {
        id: props.commentId,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
  // Step 9: Return void (204 No Content)
}
