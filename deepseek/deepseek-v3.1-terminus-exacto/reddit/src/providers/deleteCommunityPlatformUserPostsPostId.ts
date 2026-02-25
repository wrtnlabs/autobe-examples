import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the post exists and get its details
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      user_id: true,
      community_id: true,
      deleted_at: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 400);
  }
  // Check if user is the post owner
  const isOwner = post.user_id === props.user.id;
  // If user is not the owner, check if they're a moderator
  let isModerator = false;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          user_id: props.user.id,
          deleted_at: null,
        },
      });
    isModerator = moderator !== null;
  }
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Use transaction for data consistency
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date().toISOString();
    // Soft delete the post
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: { deleted_at: now },
    });
    // Soft delete all comments associated with the post
    await tx.community_platform_comments.updateMany({
      where: { community_platform_post_id: props.postId },
      data: { deleted_at: now },
    });
    // Delete all post votes
    await tx.community_platform_post_votes.deleteMany({
      where: { post_id: props.postId },
    });
    // Delete all comment votes for comments on this post
    await tx.community_platform_comment_votes.deleteMany({
      where: {
        comment: {
          community_platform_post_id: props.postId,
        },
      },
    });
    // Adjust karma - remove karma earned by the post author from post votes
    const postVotes = await tx.community_platform_post_votes.findMany({
      where: { post_id: props.postId },
      select: { vote_type: true },
    });
    // Calculate total karma impact
    let totalKarmaImpact = 0;
    for (const vote of postVotes) {
      if (vote.vote_type === "upvote") {
        totalKarmaImpact -= 1; // Remove upvote karma
      } else if (vote.vote_type === "downvote") {
        totalKarmaImpact += 1; // Remove downvote karma (reverse the negative impact)
      }
    }
    // Record karma adjustment for the post author
    if (totalKarmaImpact !== 0) {
      await tx.community_platform_vote_karma_impacts.create({
        data: {
          id: v4(),
          user_id: post.user_id, // The post author's karma is affected
          karma_delta: totalKarmaImpact,
          created_at: now,
          updated_at: now,
        },
      });
    }
  });
}
