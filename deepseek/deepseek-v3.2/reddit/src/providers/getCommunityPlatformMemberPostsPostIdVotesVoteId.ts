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

export async function getCommunityPlatformMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  // Validate post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Retrieve the vote with full relationship data
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  // Authorization: member can only view their own vote
  if (vote.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
