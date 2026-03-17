import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  if (props.body.target_type === "post") {
    // Query post vote
    const existingVote =
      await MyGlobal.prisma.community_platform_post_votes.findUnique({
        where: { id: props.voteId },
        select: {
          id: true,
          member_id: true,
          post_id: true,
          vote_type: true,
          created_at: true,
          updated_at: true,
        },
      });
    if (existingVote === null) {
      throw new HttpException("Vote not found", 404);
    }
    if (existingVote.member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // If same vote type, return current vote
    if (existingVote.vote_type === props.body.vote_type) {
      const memberData =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: props.member.id },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: existingVote.id,
        targetType: "post",
        targetId: existingVote.post_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(
            memberData,
          ),
        voteType: existingVote.vote_type,
        createdAt: existingVote.created_at.toISOString(),
        updatedAt: existingVote.updated_at.toISOString(),
      };
    }
    // Update vote only - post vote scores are computed on-demand via aggregation
    await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: props.voteId },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
    });
    // Fetch updated vote and member for response
    const updatedVote =
      await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
        where: { id: props.voteId },
        select: {
          id: true,
          vote_type: true,
          created_at: true,
          updated_at: true,
          member: CommunityPlatformMemberAtSummaryTransformer.select(),
        },
      });
    return {
      id: updatedVote.id,
      targetType: "post",
      targetId: existingVote.post_id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        updatedVote.member,
      ),
      voteType: updatedVote.vote_type,
      createdAt: updatedVote.created_at.toISOString(),
      updatedAt: updatedVote.updated_at.toISOString(),
    };
  } else {
    // Query comment vote
    const existingVote =
      await MyGlobal.prisma.community_platform_comment_votes.findUnique({
        where: { id: props.voteId },
        select: {
          id: true,
          community_platform_member_id: true,
          community_platform_comment_id: true,
          vote_type: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    if (existingVote === null || existingVote.deleted_at !== null) {
      throw new HttpException("Vote not found", 404);
    }
    if (existingVote.community_platform_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // If same vote type, return current vote
    if (existingVote.vote_type === props.body.vote_type) {
      const memberData =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: props.member.id },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: existingVote.id,
        targetType: "comment",
        targetId: existingVote.community_platform_comment_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(
            memberData,
          ),
        voteType: existingVote.vote_type,
        createdAt: existingVote.created_at.toISOString(),
        updatedAt: existingVote.updated_at.toISOString(),
      };
    }
    // Get comment and author for score/karma update
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: existingVote.community_platform_comment_id },
        select: {
          id: true,
          vote_score: true,
          community_platform_member_id: true,
        },
      });
    // Calculate adjustment: upvote->downvote = -2, downvote->upvote = +2
    const scoreAdjustment = existingVote.vote_type === "upvote" ? -2 : 2;
    // Update vote, comment score, and author karma atomically
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: props.voteId },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
      }),
      MyGlobal.prisma.community_platform_comments.update({
        where: { id: existingVote.community_platform_comment_id },
        data: { vote_score: comment.vote_score + scoreAdjustment },
      }),
      MyGlobal.prisma.community_platform_members.update({
        where: { id: comment.community_platform_member_id },
        data: { karma: { increment: scoreAdjustment } },
      }),
    ]);
    // Fetch updated vote and member for response
    const updatedVote =
      await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
        where: { id: props.voteId },
        select: {
          id: true,
          vote_type: true,
          created_at: true,
          updated_at: true,
          member: CommunityPlatformMemberAtSummaryTransformer.select(),
        },
      });
    return {
      id: updatedVote.id,
      targetType: "comment",
      targetId: existingVote.community_platform_comment_id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        updatedVote.member,
      ),
      voteType: updatedVote.vote_type,
      createdAt: updatedVote.created_at.toISOString(),
      updatedAt: updatedVote.updated_at.toISOString(),
    };
  }
}
