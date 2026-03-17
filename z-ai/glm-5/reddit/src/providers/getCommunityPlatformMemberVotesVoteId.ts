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

export async function getCommunityPlatformMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  // Try to find vote in post_votes table first
  const postVote =
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
  if (postVote !== null) {
    // Found in post_votes - get member data
    const memberData =
      await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
        where: { id: postVote.member_id },
        ...CommunityPlatformMemberAtSummaryTransformer.select(),
      });
    const member =
      await CommunityPlatformMemberAtSummaryTransformer.transform(memberData);
    return {
      id: postVote.id,
      targetType: "post",
      targetId: postVote.post_id,
      member,
      voteType: postVote.vote_type,
      createdAt: postVote.created_at.toISOString(),
      updatedAt: postVote.updated_at.toISOString(),
    } satisfies ICommunityPlatformPostVote;
  }
  // Try comment_votes table
  const commentVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.voteId },
      select: {
        id: true,
        community_platform_comment_id: true,
        community_platform_member_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (commentVote === null || commentVote.deleted_at !== null) {
    throw new HttpException("Vote not found", 404);
  }
  // Found in comment_votes - get member data
  const memberData =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: commentVote.community_platform_member_id },
      ...CommunityPlatformMemberAtSummaryTransformer.select(),
    });
  const member =
    await CommunityPlatformMemberAtSummaryTransformer.transform(memberData);
  return {
    id: commentVote.id,
    targetType: "comment",
    targetId: commentVote.community_platform_comment_id,
    member,
    voteType: commentVote.vote_type,
    createdAt: commentVote.created_at.toISOString(),
    updatedAt: commentVote.updated_at.toISOString(),
  } satisfies ICommunityPlatformPostVote;
}
