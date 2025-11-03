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

export async function getCommunityPlatformAdminPostVotesPostVoteId(props: {
  admin: AdminPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
  });
  if (!vote) {
    throw new HttpException("Post vote not found", 404);
  }
  return {
    id: vote.id,
    community_platform_user_id: vote.community_platform_user_id,
    community_platform_post_id: vote.community_platform_post_id,
    is_upvote: vote.is_upvote,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at:
      vote.deleted_at !== null ? toISOStringSafe(vote.deleted_at) : null,
  };
}
