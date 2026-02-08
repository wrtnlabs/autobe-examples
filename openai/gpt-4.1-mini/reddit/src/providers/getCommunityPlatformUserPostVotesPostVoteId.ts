import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostVotesPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const postVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: { id: props.postVoteId },
    });
  if (!postVote) {
    throw new HttpException("Post Vote not found", 404);
  }
  return {
    id: postVote.id,
    post_id: postVote.post_id,
    vote_type: postVote.vote_type,
    created_at: toISOStringSafe(postVote.created_at),
    updated_at: toISOStringSafe(postVote.updated_at),
    deleted_at: postVote.deleted_at
      ? toISOStringSafe(postVote.deleted_at)
      : null,
  };
}
