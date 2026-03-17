import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string;
  voteId: string;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  // 1. Find existing vote with ownership check
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        id: props.voteId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        type: true,
        community_platform_comment_id: true,
        community_platform_member_id: true,
      },
    });
  if (!existingVote) {
    throw new HttpException("Vote not found or you don't own it", 404);
  }
  // 2. Validate vote targets specified commentId
  if (existingVote.community_platform_comment_id !== props.commentId) {
    throw new HttpException("Vote does not target the specified comment", 400);
  }
  // 3. Validate request body
  if (
    props.body.type !== undefined &&
    props.body.type !== null &&
    props.body.type !== "upvote" &&
    props.body.type !== "downvote"
  ) {
    throw new HttpException("Invalid vote type", 400);
  }
  // 4. Determine update type
  const isRemoval = props.body.type === null;
  const isTypeChange =
    props.body.type !== undefined &&
    props.body.type !== null &&
    props.body.type !== existingVote.type;
  const isSameType =
    props.body.type !== undefined &&
    props.body.type !== null &&
    props.body.type === existingVote.type;
  // If same type, just return current vote (no-op)
  if (isSameType) {
    const vote =
      await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
        where: { id: props.voteId },
        ...CommunityPlatformCommentVoteTransformer.select(),
      });
    return await CommunityPlatformCommentVoteTransformer.transform(vote);
  }
  // 5. Get comment and author info for karma update
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
      select: {
        id: true,
        vote_score: true,
        author: {
          select: { id: true },
        },
      },
    });
  // 6. Calculate vote change effect
  const oldVoteEffect =
    existingVote.type === "upvote"
      ? 1
      : existingVote.type === "downvote"
        ? -1
        : 0;
  const newVoteEffect = isRemoval ? 0 : props.body.type === "upvote" ? 1 : -1;
  const netVoteChange = newVoteEffect - oldVoteEffect;
  const netKarmaChange = -netVoteChange; // Opposite sign for author karma
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  // 7. Execute transaction
  const updatedVote = await MyGlobal.prisma.$transaction(async (tx) => {
    // 7a. Create vote snapshot if table exists
    // Note: Assuming snapshot table exists based on schema preview
    // Fixed: Add missing required fields from error message
    await tx.community_platform_comment_vote_snapshots.create({
      data: {
        id: v4(),
        member_id: existingVote.community_platform_member_id,
        comment_id: existingVote.community_platform_comment_id,
        comment_vote_id: existingVote.id,
        vote_type: existingVote.type,
        snapshot_reason: isRemoval ? "vote_removed" : "vote_changed",
        created_at: now,
      },
    });
    // 7b. Update vote
    const voteUpdateData: Prisma.community_platform_comment_votesUpdateInput = {
      updated_at: now,
    };
    if (isRemoval) {
      voteUpdateData.deleted_at = now;
      // Don't update type field when removing, just mark as deleted
      // The field accepts string | undefined, so undefined leaves it unchanged
      voteUpdateData.type = undefined;
    } else if (props.body.type !== undefined && props.body.type !== null) {
      voteUpdateData.type = props.body.type;
    }
    const vote = await tx.community_platform_comment_votes.update({
      where: { id: props.voteId },
      data: voteUpdateData,
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
    // 7c. Update comment vote score
    if (netVoteChange !== 0) {
      await tx.community_platform_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: comment.vote_score + netVoteChange,
          updated_at: now,
        },
      });
    }
    // 7d. Update comment author karma
    if (netKarmaChange !== 0) {
      await tx.community_platform_karmas.upsert({
        where: {
          member_id: comment.author.id,
        },
        create: {
          id: v4(),
          member_id: comment.author.id,
          score: netKarmaChange,
          created_at: now,
          updated_at: now,
        },
        update: {
          score: {
            increment: netKarmaChange,
          },
          updated_at: now,
        },
      });
    }
    return vote;
  });
  // 8. Transform and return
  return await CommunityPlatformCommentVoteTransformer.transform(updatedVote);
}
