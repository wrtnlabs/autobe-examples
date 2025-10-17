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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorPostsPostIdVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<IPageICommunityPlatformPostVote> {
  const { moderator, postId, body } = props;

  // 1. Ensure the post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // 2. Normalize pagination inputs
  const page = Math.max(Number(body.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 100);
  const skip = (page - 1) * limit;

  // 3. Build where clause
  const where = {
    community_platform_post_id: postId,
    ...(body.community_platform_member_id !== undefined &&
      body.community_platform_member_id !== null && {
        community_platform_member_id: body.community_platform_member_id,
      }),
    ...(body.vote_value !== undefined &&
      (body.vote_value === 1 || body.vote_value === -1) && {
        vote_value: body.vote_value,
      }),
    ...((body.created_from !== undefined || body.created_to !== undefined) && {
      created_at: {
        ...(body.created_from !== undefined && { gte: body.created_from }),
        ...(body.created_to !== undefined && { lte: body.created_to }),
      },
    }),
    ...((body.updated_from !== undefined || body.updated_to !== undefined) && {
      updated_at: {
        ...(body.updated_from !== undefined && { gte: body.updated_from }),
        ...(body.updated_to !== undefined && { lte: body.updated_to }),
      },
    }),
    ...(body.deleted !== true && { deleted_at: null }),
  };

  // 4. Compose orderBy inline
  const allowedSortFields = ["created_at", "updated_at"];
  const sortBy = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Query votes and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_votes.findMany({
      where,
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_post_votes.count({ where }),
  ]);

  // 6. Map all results with toISOStringSafe on all Date fields
  const data = rows.map((vote) => {
    const output: ICommunityPlatformPostVote = {
      id: vote.id,
      community_platform_post_id: vote.community_platform_post_id,
      community_platform_member_id: vote.community_platform_member_id,
      vote_value: vote.vote_value === 1 ? 1 : -1,
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
    };
    if (vote.deleted_at !== undefined && vote.deleted_at !== null) {
      output.deleted_at = toISOStringSafe(vote.deleted_at);
    }
    return output;
  });

  // 7. Return paginated result
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
