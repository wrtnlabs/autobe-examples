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

export async function patchCommunityPlatformMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<ICommunityPlatformPostVote> {
  const memberId = props.member.id;
  const targetId = props.body.targetId;
  const targetType = props.body.targetType;
  const voteType = props.body.voteType;
  if (targetType === "post") {
    // Find existing vote
    const existingVote =
      await MyGlobal.prisma.community_platform_post_votes.findUnique({
        where: {
          post_id_member_id: {
            post_id: targetId,
            member_id: memberId,
          },
        },
      });
    if (voteType === null) {
      // Remove vote
      if (!existingVote) {
        throw new HttpException("Vote not found", 404);
      }
      // Get post author for karma adjustment
      const post =
        await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
          where: { id: targetId },
          select: { author_id: true },
        });
      const karmaChange = existingVote.vote_type === "upvote" ? -1 : 1;
      await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_platform_post_votes.delete({
          where: { id: existingVote.id },
        }),
        MyGlobal.prisma.community_platform_members.update({
          where: { id: post.author_id },
          data: { karma: { increment: karmaChange } },
        }),
      ]);
      // Return the removed vote info
      const member =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: memberId },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: existingVote.id,
        targetType: "post",
        targetId: existingVote.post_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(member),
        voteType: existingVote.vote_type,
        createdAt: existingVote.created_at.toISOString(),
        updatedAt: existingVote.updated_at.toISOString(),
      };
    }
    if (existingVote) {
      // Change vote
      if (existingVote.vote_type === voteType) {
        // Same vote type, just return existing
        const member =
          await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
            where: { id: memberId },
            ...CommunityPlatformMemberAtSummaryTransformer.select(),
          });
        return {
          id: existingVote.id,
          targetType: "post",
          targetId: existingVote.post_id,
          member:
            await CommunityPlatformMemberAtSummaryTransformer.transform(member),
          voteType: existingVote.vote_type,
          createdAt: existingVote.created_at.toISOString(),
          updatedAt: existingVote.updated_at.toISOString(),
        };
      }
      const post =
        await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
          where: { id: targetId },
          select: { author_id: true },
        });
      // Changing from upvote to downvote: -2 karma, downvote to upvote: +2 karma
      const karmaChange =
        existingVote.vote_type === "upvote" && voteType === "downvote" ? -2 : 2;
      const now = new Date();
      const result = await MyGlobal.prisma.$transaction(async (tx) => {
        const updatedVote = await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: voteType,
            updated_at: now,
          },
        });
        await tx.community_platform_members.update({
          where: { id: post.author_id },
          data: { karma: { increment: karmaChange } },
        });
        return updatedVote;
      });
      const member =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: memberId },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: result.id,
        targetType: "post",
        targetId: result.post_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(member),
        voteType: result.vote_type,
        createdAt: result.created_at.toISOString(),
        updatedAt: result.updated_at.toISOString(),
      };
    } else {
      // Create new vote
      const post =
        await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
          where: { id: targetId },
          select: { author_id: true },
        });
      const karmaChange = voteType === "upvote" ? 1 : -1;
      const voteId = v4();
      const now = new Date();
      const result = await MyGlobal.prisma.$transaction(async (tx) => {
        const newVote = await tx.community_platform_post_votes.create({
          data: {
            id: voteId,
            member_id: memberId,
            post_id: targetId,
            vote_type: voteType,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.community_platform_members.update({
          where: { id: post.author_id },
          data: { karma: { increment: karmaChange } },
        });
        return newVote;
      });
      const member =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: memberId },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: result.id,
        targetType: "post",
        targetId: result.post_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(member),
        voteType: result.vote_type,
        createdAt: result.created_at.toISOString(),
        updatedAt: result.updated_at.toISOString(),
      };
    }
  } else {
    // Comment votes - comments have vote_score field
    const existingVote =
      await MyGlobal.prisma.community_platform_comment_votes.findUnique({
        where: {
          community_platform_comment_id_community_platform_member_id: {
            community_platform_comment_id: targetId,
            community_platform_member_id: memberId,
          },
        },
      });
    if (voteType === null) {
      // Remove vote
      if (!existingVote) {
        throw new HttpException("Vote not found", 404);
      }
      const comment =
        await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
          where: { id: targetId },
          select: { community_platform_member_id: true },
        });
      const scoreChange = existingVote.vote_type === "upvote" ? -1 : 1;
      await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_platform_comment_votes.delete({
          where: { id: existingVote.id },
        }),
        MyGlobal.prisma.community_platform_comments.update({
          where: { id: targetId },
          data: { vote_score: { increment: scoreChange } },
        }),
        MyGlobal.prisma.community_platform_members.update({
          where: { id: comment.community_platform_member_id },
          data: { karma: { increment: scoreChange } },
        }),
      ]);
      const member =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: memberId },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: existingVote.id,
        targetType: "comment",
        targetId: existingVote.community_platform_comment_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(member),
        voteType: existingVote.vote_type,
        createdAt: existingVote.created_at.toISOString(),
        updatedAt: existingVote.updated_at.toISOString(),
      };
    }
    if (existingVote) {
      // Change vote
      if (existingVote.vote_type === voteType) {
        const member =
          await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
            where: { id: memberId },
            ...CommunityPlatformMemberAtSummaryTransformer.select(),
          });
        return {
          id: existingVote.id,
          targetType: "comment",
          targetId: existingVote.community_platform_comment_id,
          member:
            await CommunityPlatformMemberAtSummaryTransformer.transform(member),
          voteType: existingVote.vote_type,
          createdAt: existingVote.created_at.toISOString(),
          updatedAt: existingVote.updated_at.toISOString(),
        };
      }
      const comment =
        await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
          where: { id: targetId },
          select: { community_platform_member_id: true },
        });
      // Changing vote: score change is 2 (remove old effect, add new effect)
      const scoreChange =
        existingVote.vote_type === "upvote" && voteType === "downvote" ? -2 : 2;
      const now = new Date();
      const result = await MyGlobal.prisma.$transaction(async (tx) => {
        const updatedVote = await tx.community_platform_comment_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: voteType,
            updated_at: now,
          },
        });
        await tx.community_platform_comments.update({
          where: { id: targetId },
          data: { vote_score: { increment: scoreChange } },
        });
        await tx.community_platform_members.update({
          where: { id: comment.community_platform_member_id },
          data: { karma: { increment: scoreChange } },
        });
        return updatedVote;
      });
      const member =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: memberId },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: result.id,
        targetType: "comment",
        targetId: result.community_platform_comment_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(member),
        voteType: result.vote_type,
        createdAt: result.created_at.toISOString(),
        updatedAt: result.updated_at.toISOString(),
      };
    } else {
      // Create new vote
      const comment =
        await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
          where: { id: targetId },
          select: { community_platform_member_id: true },
        });
      const scoreChange = voteType === "upvote" ? 1 : -1;
      const voteId = v4();
      const now = new Date();
      const result = await MyGlobal.prisma.$transaction(async (tx) => {
        const newVote = await tx.community_platform_comment_votes.create({
          data: {
            id: voteId,
            community_platform_member_id: memberId,
            community_platform_comment_id: targetId,
            vote_type: voteType,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.community_platform_comments.update({
          where: { id: targetId },
          data: { vote_score: { increment: scoreChange } },
        });
        await tx.community_platform_members.update({
          where: { id: comment.community_platform_member_id },
          data: { karma: { increment: scoreChange } },
        });
        return newVote;
      });
      const member =
        await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
          where: { id: memberId },
          ...CommunityPlatformMemberAtSummaryTransformer.select(),
        });
      return {
        id: result.id,
        targetType: "comment",
        targetId: result.community_platform_comment_id,
        member:
          await CommunityPlatformMemberAtSummaryTransformer.transform(member),
        voteType: result.vote_type,
        createdAt: result.created_at.toISOString(),
        updatedAt: result.updated_at.toISOString(),
      };
    }
  }
}
