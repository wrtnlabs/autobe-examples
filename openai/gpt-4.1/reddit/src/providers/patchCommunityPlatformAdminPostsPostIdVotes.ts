import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminPostsPostIdVotes(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<IPageICommunityPlatformPostVote> {
  // Authorization: Only admins can call this (presence/type checked at controller)
  const { postId, body } = props;
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Pagination
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const rawLimit =
    typeof body.limit === "number" && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (page - 1) * limit;

  // Sorting
  const sortField = body.sort_by === "updated_at" ? "updated_at" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Filtering
  const where: Record<string, unknown> = { community_platform_post_id: postId };
  if (
    body.community_platform_member_id !== undefined &&
    body.community_platform_member_id !== null
  ) {
    where.community_platform_member_id = body.community_platform_member_id;
  }
  if (body.vote_value === 1) {
    where.vote_value = 1;
  } else if (body.vote_value === -1) {
    where.vote_value = -1;
  }
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    where.created_at = {
      ...(body.created_from !== undefined &&
        body.created_from !== null && { gte: body.created_from }),
      ...(body.created_to !== undefined &&
        body.created_to !== null && { lte: body.created_to }),
    };
  }
  if (
    (body.updated_from !== undefined && body.updated_from !== null) ||
    (body.updated_to !== undefined && body.updated_to !== null)
  ) {
    where.updated_at = {
      ...(body.updated_from !== undefined &&
        body.updated_from !== null && { gte: body.updated_from }),
      ...(body.updated_to !== undefined &&
        body.updated_to !== null && { lte: body.updated_to }),
    };
  }
  // Handle status/deleted filtering
  if (body.status === "revoked") {
    where.deleted_at = { not: null };
  } else if (body.status === "active") {
    where.deleted_at = null;
  } else if (body.deleted === true) {
    // include both active and revoked
  } else {
    // default: only active
    where.deleted_at = null;
  }

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_votes.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_post_votes.count({ where }),
  ]);

  const data = rows.map(
    (vote) =>
      ({
        id: vote.id,
        community_platform_post_id: vote.community_platform_post_id,
        community_platform_member_id: vote.community_platform_member_id,
        vote_value: vote.vote_value === 1 ? 1 : (-1 as 1 | -1),
        created_at: toISOStringSafe(vote.created_at),
        updated_at: toISOStringSafe(vote.updated_at),
        deleted_at:
          vote.deleted_at !== undefined && vote.deleted_at !== null
            ? toISOStringSafe(vote.deleted_at)
            : null,
      }) satisfies ICommunityPlatformPostVote,
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
