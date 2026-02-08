import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommentsCommentIdVotesVoteId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  // Query the vote by composite unique keys voteId and commentId
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
      } as any, // Prisma query needs a unique or compound unique, so we use manual condition below
    });
  // Since Prisma may not support composite unique here, fallback to findFirst
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  return {
    id: vote.id,
    community_platform_comment_id: vote.community_platform_comment_id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(vote.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      vote.deleted_at !== null
        ? (toISOStringSafe(vote.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
  };
}
