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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberVotesPostVoteId(props: {
  member: MemberPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const postVote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        id: props.postVoteId,
      },
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community_platform_member_id: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
      } satisfies Prisma.community_platform_post_votesSelect,
    });
  if (postVote.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (postVote.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformPostVoteTransformer.transform({
    id: postVote.id,
    direction: postVote.direction,
    created_at: postVote.created_at,
    updated_at: postVote.updated_at,
    deleted_at: postVote.deleted_at,
    member: postVote.member,
    post: postVote.post,
  });
}
