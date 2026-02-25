import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommentVotesCommentVoteId(props: {
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  // Find the vote record (not soft-deleted)
  const voteRecord =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.commentVoteId },
      select: {
        id: true,
        community_platform_comment_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (voteRecord.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Aggregate the total votes of the comment
  const aggregate =
    await MyGlobal.prisma.community_platform_comment_votes.aggregate({
      _count: {
        _all: true,
        vote_type: true,
      },
      where: {
        community_platform_comment_id: voteRecord.community_platform_comment_id,
        deleted_at: null,
        vote_type: "upvote",
      },
    });
  const upvoteCount = aggregate._count?.vote_type ?? 0;
  const downvoteAggregate =
    await MyGlobal.prisma.community_platform_comment_votes.aggregate({
      _count: {
        _all: true,
        vote_type: true,
      },
      where: {
        community_platform_comment_id: voteRecord.community_platform_comment_id,
        deleted_at: null,
        vote_type: "downvote",
      },
    });
  const downvoteCount = downvoteAggregate._count?.vote_type ?? 0;
  return {
    upvoteCount,
    downvoteCount,
  };
}
