import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorPostVotesPostVoteId(props: {
  administrator: AdministratorPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
    include: {
      post: { select: { id: true, community_id: true, user_id: true } },
      user: { select: { id: true } },
    },
  });
  if (!vote) {
    throw new HttpException("Post vote record not found", 404);
  }
  return {
    id: vote.id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
    post: vote.post
      ? {
          id: vote.post.id,
          community_id: vote.post.community_id,
          user_id: vote.post.user_id,
        }
      : undefined,
    user: vote.user ? { id: vote.user.id } : undefined,
  };
}
