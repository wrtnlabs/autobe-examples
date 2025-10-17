import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  let orderByField: string;
  let orderByDirection: "asc" | "desc";
  switch (body.sort_by) {
    case "old":
      orderByField = "created_at";
      orderByDirection = "asc";
      break;
    case "new":
      orderByField = "created_at";
      orderByDirection = "desc";
      break;
    default:
      orderByField = "created_at";
      orderByDirection = "desc";
  }

  // Build where clause only with valid fields
  const where = {
    community_platform_post_id: props.postId,
    deleted_at: null,
    ...(body.nesting_level !== undefined
      ? { nesting_level: body.nesting_level }
      : {}),
    ...(body.parent_id !== undefined ? { parent_id: body.parent_id } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.member_id !== undefined
      ? { community_platform_member_id: body.member_id }
      : {}),
    ...(body.date_from !== undefined || body.date_to !== undefined
      ? {
          created_at: {
            ...(body.date_from !== undefined ? { gte: body.date_from } : {}),
            ...(body.date_to !== undefined ? { lte: body.date_to } : {}),
          },
        }
      : {}),
    ...(body.search !== undefined && body.search.length > 0
      ? { body: { contains: body.search } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findMany({
      where: where,
      orderBy: { [orderByField]: orderByDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_comments.count({ where: where }),
  ]);

  const data = rows.map((comment) => ({
    id: comment.id,
    community_platform_post_id: comment.community_platform_post_id,
    community_platform_member_id: comment.community_platform_member_id,
    parent_id: comment.parent_id ?? undefined,
    nesting_level: comment.nesting_level,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
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
