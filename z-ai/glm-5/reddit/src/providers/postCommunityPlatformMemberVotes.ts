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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const memberId = props.member.id;
  const targetType = props.body.targetType;
  const targetId = props.body.targetId;
  const voteType = props.body.voteType;
  const scoreDelta = voteType === "upvote" ? 1 : -1;
  // Fetch voting member once for response
  const memberRecord =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        karma: true,
        created_at: true,
      },
    });
  if (targetType === "post") {
    // Verify post exists and is not deleted
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: {
          id: targetId,
          deleted_at: null,
        },
        select: { id: true, author_id: true },
      });
    // Check for existing vote using compound unique constraint
    const existingVote =
      await MyGlobal.prisma.community_platform_post_votes.findUnique({
        where: {
          post_id_member_id: {
            post_id: targetId,
            member_id: memberId,
          },
        },
      });
    if (existingVote !== null) {
      throw new HttpException("Vote already exists for this post", 409);
    }
    // Create vote and update author karma
    // Note: Posts don't have vote_score column - computed via aggregation
    const now = new Date();
    const voteId = v4();
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_post_votes.create({
        data: {
          id: voteId,
          post_id: targetId,
          member_id: memberId,
          vote_type: voteType,
          created_at: now,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.community_platform_members.update({
        where: { id: post.author_id },
        data: {
          karma: { increment: scoreDelta },
        },
      }),
    ]);
    return {
      id: voteId,
      targetType: "post",
      targetId: targetId,
      member: {
        id: memberRecord.id,
        username: memberRecord.username,
        displayName: memberRecord.display_name,
        bio: memberRecord.bio,
        karma: memberRecord.karma,
        avatar: null,
        createdAt: memberRecord.created_at.toISOString(),
      },
      voteType: voteType,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
  // targetType === 'comment'
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: targetId,
        deleted_at: null,
      },
      select: { id: true, community_platform_member_id: true },
    });
  // Check for existing vote
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        community_platform_comment_id_community_platform_member_id: {
          community_platform_comment_id: targetId,
          community_platform_member_id: memberId,
        },
      },
    });
  if (existingVote !== null) {
    throw new HttpException("Vote already exists for this comment", 409);
  }
  const now = new Date();
  const voteId = v4();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_comment_votes.create({
      data: {
        id: voteId,
        community_platform_comment_id: targetId,
        community_platform_member_id: memberId,
        vote_type: voteType,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.community_platform_comments.update({
      where: { id: targetId },
      data: {
        vote_score: { increment: scoreDelta },
      },
    }),
    MyGlobal.prisma.community_platform_members.update({
      where: { id: comment.community_platform_member_id },
      data: {
        karma: { increment: scoreDelta },
      },
    }),
  ]);
  return {
    id: voteId,
    targetType: "comment",
    targetId: targetId,
    member: {
      id: memberRecord.id,
      username: memberRecord.username,
      displayName: memberRecord.display_name,
      bio: memberRecord.bio,
      karma: memberRecord.karma,
      avatar: null,
      createdAt: memberRecord.created_at.toISOString(),
    },
    voteType: voteType,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
