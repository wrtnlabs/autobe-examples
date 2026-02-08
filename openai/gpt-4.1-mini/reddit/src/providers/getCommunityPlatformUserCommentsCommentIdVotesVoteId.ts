import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function getCommunityPlatformUserCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
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
  if (!vote) throw new HttpException("Vote not found", 404);
  return {
    id: vote.id as string & tags.Format<"uuid">,
    community_platform_comment_id:
      vote.community_platform_comment_id as string & tags.Format<"uuid">,
    vote_type: vote.vote_type,
    created_at: vote.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: vote.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      vote.deleted_at === null
        ? null
        : (vote.deleted_at.toISOString() as
            | (string & tags.Format<"date-time">)
            | null),
  };
}
