import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorPostsPostIdVotesVoteId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const { postId, voteId } = props;
  const vote = await MyGlobal.prisma.community_platform_post_votes.findFirst({
    where: {
      id: voteId,
      community_platform_post_id: postId,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found for this post", 404);
  }
  return {
    id: vote.id,
    community_platform_post_id: vote.community_platform_post_id,
    community_platform_member_id: vote.community_platform_member_id,
    vote_value: typia.assert<1 | -1>(vote.vote_value),
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
