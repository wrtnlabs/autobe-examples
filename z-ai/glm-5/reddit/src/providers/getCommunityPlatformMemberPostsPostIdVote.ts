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

export async function getCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  // Verify post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Query the member's vote on this post
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: {
      post_id_member_id: {
        post_id: props.postId,
        member_id: props.member.id,
      },
    },
    select: {
      id: true,
      post_id: true,
      member_id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  // Fetch member details using transformer
  const memberRecord =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...CommunityPlatformMemberAtSummaryTransformer.select(),
    });
  return {
    id: vote.id,
    targetType: "post",
    targetId: vote.post_id,
    member:
      await CommunityPlatformMemberAtSummaryTransformer.transform(memberRecord),
    voteType: vote.vote_type,
    createdAt: vote.created_at.toISOString(),
    updatedAt: vote.updated_at.toISOString(),
  };
}
