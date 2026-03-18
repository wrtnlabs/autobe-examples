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
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findFirstOrThrow({
      where: {
        id: props.voteId,
        community_platform_post_id: props.postId,
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  // Participant-level authorization: members can only view their own vote record.
  if (vote.voter_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
