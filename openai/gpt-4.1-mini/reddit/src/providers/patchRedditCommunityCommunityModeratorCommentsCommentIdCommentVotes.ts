import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IPageIRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function patchRedditCommunityCommunityModeratorCommentsCommentIdCommentVotes(props: {
  communityModerator: CommunitymoderatorPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.IRequest;
}): Promise<IPageIRedditCommunityCommentVote> {
  const { commentId, body } = props;

  const page = body.page > 0 ? body.page : 1;
  const limit = body.limit > 0 ? body.limit : 100;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "id",
    "member_id",
    "comment_id",
    "vote_value",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const orderBy = body.order_by === "asc" ? "asc" : "desc";

  const where = {
    comment_id: commentId,
    deleted_at: null,
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_votes.findMany({
      where,
      orderBy: { [sortField]: orderBy },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_comment_votes.count({ where }),
  ]);

  const data = results.map((vote) => ({
    id: vote.id,
    member_id: vote.member_id,
    comment_id: vote.comment_id,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
