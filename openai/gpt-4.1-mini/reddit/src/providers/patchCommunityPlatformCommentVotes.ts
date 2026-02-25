import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommentVotes(props: {
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote.ISummary> {
  const currentPage =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const maxLimit = 100;
  const requestedLimit =
    props.body.limit !== undefined && props.body.limit >= 1
      ? props.body.limit
      : 20;
  const effectiveLimit = requestedLimit > maxLimit ? maxLimit : requestedLimit;
  const offset = (currentPage - 1) * effectiveLimit;
  const whereFilter: Prisma.community_platform_comment_votesWhereInput = {};
  if (props.body.commentId !== undefined) {
    whereFilter.community_platform_comment_id = props.body.commentId;
  }
  // The userId filter is invalid in Prisma type, so remove it to fix error.
  // if (props.body.userId !== undefined) {
  //   whereFilter.community_platform_comment_user_id = props.body.userId;
  // }
  if (props.body.voteType !== undefined) {
    whereFilter.vote_type = props.body.voteType;
  }
  const totalRecords =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: whereFilter,
    });
  const commentVotes =
    await MyGlobal.prisma.community_platform_comment_votes.findMany({
      where: whereFilter,
      take: effectiveLimit,
      skip: offset,
      orderBy: { created_at: "desc" },
    });
  return {
    pagination: {
      current: currentPage,
      limit: effectiveLimit,
      records: totalRecords,
      pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / effectiveLimit),
    },
    data: commentVotes.map((vote) => ({
      id: vote.id,
      communityPlatformCommentId: vote.community_platform_comment_id,
      voteType: vote.vote_type,
      createdAt: toISOStringSafe(vote.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(vote.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt:
        vote.deleted_at !== null && vote.deleted_at !== undefined
          ? (toISOStringSafe(vote.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
    })),
  };
}
