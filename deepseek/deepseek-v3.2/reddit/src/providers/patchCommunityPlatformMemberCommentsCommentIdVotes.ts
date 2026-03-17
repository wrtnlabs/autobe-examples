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
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteTransformer } from "../transformers/CommunityPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<ICommunityPlatformCommentVote> {
  // Validate comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        author: {
          select: { id: true },
        },
        vote_score: true,
      },
    });
  // Find existing vote for this member on this comment
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        type: true,
      },
    });
  // Start transaction for atomic updates
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    let voteId: string;
    let voteType: string | null = props.body.type ?? null;
    if (existingVote) {
      // Update existing vote
      voteId = existingVote.id;
      if (voteType === null) {
        // Remove vote (soft delete)
        await tx.community_platform_comment_votes.update({
          where: { id: voteId },
          data: {
            deleted_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else {
        // Update vote type
        await tx.community_platform_comment_votes.update({
          where: { id: voteId },
          data: {
            type: voteType,
            updated_at: new Date(),
          },
        });
      }
    } else {
      // Create new vote if type is specified
      if (voteType === null) {
        throw new HttpException("Cannot remove non-existent vote", 400);
      }
      // Convert string to literal type "upvote" | "downvote"
      const voteTypeLiteral = typia.assert<"upvote" | "downvote">(voteType);
      const newVote = await tx.community_platform_comment_votes.create({
        data: await CommunityPlatformCommentVoteCollector.collect({
          body: { type: voteTypeLiteral },
          communityPlatformMembers: { id: props.member.id },
          communityPlatformComments: { id: props.commentId },
        }),
      });
      voteId = newVote.id;
    }
    // Calculate vote score adjustment
    const oldVoteType = existingVote?.type ?? null;
    const newVoteType = voteType;
    let scoreAdjustment = 0;
    // Upvote = +1, Downvote = -1, No vote = 0
    const getVoteValue = (type: string | null): number => {
      if (type === "upvote") return 1;
      if (type === "downvote") return -1;
      return 0;
    };
    const oldValue = getVoteValue(oldVoteType);
    const newValue = getVoteValue(newVoteType);
    scoreAdjustment = newValue - oldValue;
    // Update comment vote score
    if (scoreAdjustment !== 0) {
      await tx.community_platform_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: comment.vote_score + scoreAdjustment,
        },
      });
      // Update karma for comment author
      const currentTime = toISOStringSafe(new Date());
      await tx.community_platform_karmas.upsert({
        where: { member_id: comment.author.id },
        update: {
          score: { increment: scoreAdjustment },
          updated_at: currentTime,
        },
        create: {
          id: v4(),
          score: scoreAdjustment,
          member_id: comment.author.id,
          created_at: currentTime,
          updated_at: currentTime,
        },
      });
    }
    // Return the updated vote record
    return await tx.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...CommunityPlatformCommentVoteTransformer.select(),
    });
  });
  // Transform and return the vote
  return await CommunityPlatformCommentVoteTransformer.transform(result);
}
