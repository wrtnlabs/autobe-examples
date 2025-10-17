import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminPostsPostIdVotesVoteId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.voteId },
  });
  if (!vote || vote.community_platform_post_id !== props.postId) {
    throw new HttpException("Vote not found for the specified post.", 404);
  }

  return {
    id: vote.id,
    community_platform_post_id: vote.community_platform_post_id,
    community_platform_member_id: vote.community_platform_member_id,
    vote_value: vote.vote_value === 1 ? 1 : -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
