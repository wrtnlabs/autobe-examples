import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommentVotes(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<IPageICommunityPlatformCommentVote> {
  const {
    user_id,
    comment_id,
    is_upvote,
    created_from,
    created_to,
    updated_from,
    updated_to,
    include_deleted,
    page: bodyPage,
    limit: bodyLimit,
    sort_by,
    sort_direction,
  } = props.body;

  const page = bodyPage ?? 1;
  let limit = bodyLimit ?? 20;
  if (limit > 100) limit = 100;

  const where: Record<string, unknown> = {
    ...(user_id !== undefined && { community_platform_user_id: user_id }),
    ...(comment_id !== undefined && {
      community_platform_comment_id: comment_id,
    }),
    ...(is_upvote !== undefined && { is_upvote }),
    ...((created_from !== undefined || created_to !== undefined) && {
      created_at: {
        ...(created_from !== undefined && { gte: created_from }),
        ...(created_to !== undefined && { lte: created_to }),
      },
    }),
    ...((updated_from !== undefined || updated_to !== undefined) && {
      updated_at: {
        ...(updated_from !== undefined && { gte: updated_from }),
        ...(updated_to !== undefined && { lte: updated_to }),
      },
    }),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  const allowedSortFields = ["created_at", "updated_at", "deleted_at"];
  const sortField = allowedSortFields.includes(sort_by ?? "")
    ? sort_by!
    : "created_at";
  const sortDir = sort_direction === "asc" ? "asc" : "desc";

  const [votes, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_votes.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_comment_votes.count({ where }),
  ]);

  const data = votes.map((v) => ({
    id: v.id,
    community_platform_user_id: v.community_platform_user_id,
    community_platform_comment_id: v.community_platform_comment_id,
    is_upvote: v.is_upvote,
    created_at: toISOStringSafe(v.created_at),
    updated_at: toISOStringSafe(v.updated_at),
    deleted_at: v.deleted_at ? toISOStringSafe(v.deleted_at) : undefined,
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
