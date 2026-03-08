import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.IRequest;
}): Promise<ICommunityPlatformVote> {
  // 1. Verify post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        author_id: true,
      },
    },
  );
  // 2. Find existing vote for this member-post pair
  const existingVote =
    await MyGlobal.prisma.community_platform_votes.findUnique({
      where: {
        post_id_member_id: {
          post_id: props.postId,
          member_id: props.member.id,
        },
      },
    });
  // 3. Handle vote removal (vote_type is null)
  if (props.body.voteType === null) {
    if (!existingVote) {
      throw new HttpException("No vote to remove", 404);
    }
    const previousType = existingVote.vote_type;
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Delete the vote
      await tx.community_platform_votes.delete({
        where: { id: existingVote.id },
      });
      // Recalculate post score from aggregates
      const [upvotes, downvotes] = await Promise.all([
        tx.community_platform_votes.count({
          where: { post_id: props.postId, vote_type: "upvote" },
        }),
        tx.community_platform_votes.count({
          where: { post_id: props.postId, vote_type: "downvote" },
        }),
      ]);
      const score = upvotes - downvotes;
      // Update post score
      await tx.community_platform_posts.update({
        where: { id: props.postId },
        data: { score },
      });
      // Adjust author karma (reverse the previous vote effect)
      const karmaDelta = previousType === "upvote" ? -1 : 1;
      await tx.community_platform_members.update({
        where: { id: post.author_id },
        data: {
          karma: {
            increment: karmaDelta,
          },
        },
      });
    });
    // For vote removal, return the deleted vote info with null indication
    // The API layer handles the null response appropriately
    return {
      id: existingVote.id,
      voteType: existingVote.vote_type === "upvote" ? "upvote" : "downvote",
      createdAt: existingVote.created_at.toISOString(),
      updatedAt: existingVote.updated_at.toISOString(),
    };
  }
  const newVoteType = props.body.voteType;
  // 4. Check for idempotent case (same vote type already exists)
  if (existingVote && existingVote.vote_type === newVoteType) {
    // No change needed, return existing vote
    return {
      id: existingVote.id,
      voteType: existingVote.vote_type === "upvote" ? "upvote" : "downvote",
      createdAt: existingVote.created_at.toISOString(),
      updatedAt: existingVote.updated_at.toISOString(),
    };
  }
  // 5. Handle vote casting or changing
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (existingVote) {
      // Update existing vote (vote type is different)
      await tx.community_platform_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: newVoteType,
          updated_at: new Date(),
        },
      });
    } else {
      // Create new vote
      await tx.community_platform_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          post_id: props.postId,
          comment_id: null,
          vote_type: newVoteType,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Recalculate post score from aggregates
    const [upvotes, downvotes] = await Promise.all([
      tx.community_platform_votes.count({
        where: { post_id: props.postId, vote_type: "upvote" },
      }),
      tx.community_platform_votes.count({
        where: { post_id: props.postId, vote_type: "downvote" },
      }),
    ]);
    const score = upvotes - downvotes;
    // Update post score
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: { score },
    });
    // Adjust author karma
    let karmaDelta: number;
    if (!existingVote) {
      // New vote: +1 for upvote, -1 for downvote
      karmaDelta = newVoteType === "upvote" ? 1 : -1;
    } else {
      // Vote change: +2 if changing from downvote to upvote, -2 if from upvote to downvote
      karmaDelta = newVoteType === "upvote" ? 2 : -2;
    }
    await tx.community_platform_members.update({
      where: { id: post.author_id },
      data: {
        karma: {
          increment: karmaDelta,
        },
      },
    });
  });
  // 6. Fetch and return the vote using transformer
  const vote = await MyGlobal.prisma.community_platform_votes.findUniqueOrThrow(
    {
      where: {
        post_id_member_id: {
          post_id: props.postId,
          member_id: props.member.id,
        },
      },
      ...CommunityPlatformVoteTransformer.select(),
    },
  );
  return CommunityPlatformVoteTransformer.transform(vote);
}
