import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommentsCommentIdVotesVoteId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const vote = await MyGlobal.prisma.community_platform_comment_votes.findFirst(
    {
      where: {
        id: props.voteId,
        community_platform_comment_id: props.commentId,
        deleted_at: null,
      },
    },
  );
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  return {
    id: vote.id,
    community_platform_comment_id: vote.community_platform_comment_id,
    community_platform_member_id: vote.community_platform_member_id,
    vote_value: vote.vote_value === 1 ? 1 : -1,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at:
      vote.deleted_at === null || vote.deleted_at === undefined
        ? undefined
        : toISOStringSafe(vote.deleted_at),
  };
}
