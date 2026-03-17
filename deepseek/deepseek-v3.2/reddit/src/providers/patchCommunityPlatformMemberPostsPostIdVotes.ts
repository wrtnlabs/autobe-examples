import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  // Validate postId format
  if (!typia.is<tags.Format<"uuid">>(props.postId)) {
    throw new HttpException("Invalid post ID format", 400);
  }
  // Validate vote type if provided
  if (
    props.body.type !== undefined &&
    props.body.type !== "up" &&
    props.body.type !== "down" &&
    props.body.type !== null
  ) {
    throw new HttpException("Vote type must be 'up', 'down', or null", 400);
  }
  // Verify post exists and not deleted, get author ID for karma
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_member_id: true, // Author ID
    },
  });
  if (!post) {
    throw new HttpException("Post not found or deleted", 404);
  }
  // Check if member is trying to vote on their own post
  if (post.community_platform_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 400);
  }
  // Find existing vote
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        type: true,
      },
    });
  // Calculate karma adjustment based on vote change
  let karmaAdjustment = 0;
  if (existingVote) {
    // Existing vote - calculate change
    if (props.body.type === undefined) {
      // No change requested
      karmaAdjustment = 0;
    } else if (props.body.type === existingVote.type) {
      // Same type - no karma change
      karmaAdjustment = 0;
    } else {
      // Vote change
      if (existingVote.type === "up" && props.body.type === "down") {
        karmaAdjustment = -2; // Remove +1, apply -1
      } else if (existingVote.type === "down" && props.body.type === "up") {
        karmaAdjustment = 2; // Remove -1, apply +1
      } else if (existingVote.type === "up" && props.body.type === null) {
        karmaAdjustment = -1; // Remove upvote
      } else if (existingVote.type === "down" && props.body.type === null) {
        karmaAdjustment = 1; // Remove downvote
      } else if (existingVote.type === null && props.body.type !== null) {
        // Restoring vote from null
        karmaAdjustment = props.body.type === "up" ? 1 : -1;
      }
    }
  } else {
    // New vote
    if (props.body.type === "up") {
      karmaAdjustment = 1;
    } else if (props.body.type === "down") {
      karmaAdjustment = -1;
    } else if (props.body.type === null) {
      throw new HttpException("Cannot remove non-existent vote", 400);
    }
  }
  // Use transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    // Handle vote creation/update/removal
    let voteRecord;
    if (existingVote) {
      if (props.body.type === undefined) {
        // No change - fetch existing vote
        voteRecord = await tx.community_platform_post_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          ...CommunityPlatformPostVoteTransformer.select(),
        });
      } else if (props.body.type === null) {
        // Remove vote - soft delete
        voteRecord = await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            type: null,
            deleted_at: now,
            updated_at: now,
          },
          ...CommunityPlatformPostVoteTransformer.select(),
        });
      } else {
        // Update vote type
        voteRecord = await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            type: props.body.type,
            updated_at: now,
            deleted_at: null, // Ensure not deleted if restoring
          },
          ...CommunityPlatformPostVoteTransformer.select(),
        });
      }
    } else {
      // New vote
      if (props.body.type === undefined || props.body.type === null) {
        throw new HttpException("Cannot remove non-existent vote", 400);
      }
      voteRecord = await tx.community_platform_post_votes.create({
        data: {
          id: v4(),
          community_platform_member_id: props.member.id,
          community_platform_post_id: props.postId,
          type: props.body.type,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        ...CommunityPlatformPostVoteTransformer.select(),
      });
    }
    // Update karma if adjustment needed
    if (karmaAdjustment !== 0) {
      // Find or create karma record for post author
      const existingKarma = await tx.community_platform_karmas.findFirst({
        where: {
          member_id: post.community_platform_member_id,
        },
      });
      if (existingKarma) {
        await tx.community_platform_karmas.update({
          where: { id: existingKarma.id },
          data: {
            score: { increment: karmaAdjustment },
            updated_at: now,
          },
        });
      } else {
        // Create new karma record
        await tx.community_platform_karmas.create({
          data: {
            id: v4(),
            member_id: post.community_platform_member_id,
            score: karmaAdjustment,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
    }
    return voteRecord;
  });
  // Transform and return
  return await CommunityPlatformPostVoteTransformer.transform(result);
}
