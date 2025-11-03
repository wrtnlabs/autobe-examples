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
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const { body } = props;

  // Pagination and sorting options
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderByField = body.order_by ?? "created_at";
  const orderDirection = body.order_direction ?? "desc";

  // Build created_at and updated_at range filters (gte/lte composition)
  let createdAtFilter: any = undefined;
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    createdAtFilter = { ...(createdAtFilter || {}), gte: body.created_at_from };
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    createdAtFilter = { ...(createdAtFilter || {}), lte: body.created_at_to };
  }
  let updatedAtFilter: any = undefined;
  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    updatedAtFilter = { ...(updatedAtFilter || {}), gte: body.updated_at_from };
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    updatedAtFilter = { ...(updatedAtFilter || {}), lte: body.updated_at_to };
  }

  // Compose where clause using all user-supplied filters
  const where = {
    ...(body.post_id !== undefined &&
      body.post_id !== null && { post_id: body.post_id }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.parent_comment_id !== undefined &&
      body.parent_comment_id !== null && {
        parent_comment_id: body.parent_comment_id,
      }),
    ...(body.nest_depth !== undefined &&
      body.nest_depth !== null && { nest_depth: body.nest_depth }),
    ...(body.is_removed !== undefined &&
      body.is_removed !== null && { is_removed: body.is_removed }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(updatedAtFilter !== undefined && { updated_at: updatedAtFilter }),
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
      include: {
        user: true,
        post: {
          include: {
            user: true,
            community: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_platform_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: comments.map((c) => ({
      id: c.id,
      user: {
        id: c.user.id,
        display_name: c.user.display_name,
      },
      post: {
        id: c.post.id,
        title: c.post.title,
        status: c.post.status,
        created_at: toISOStringSafe(c.post.created_at),
        updated_at: c.post.updated_at
          ? toISOStringSafe(c.post.updated_at)
          : undefined,
        user: {
          id: c.post.user.id,
          display_name: c.post.user.display_name,
        },
        community: {
          id: c.post.community.id,
          name: c.post.community.name,
          description: c.post.community.description,
        },
      },
      parent_comment_id: c.parent_comment_id ?? null,
      nest_depth: c.nest_depth,
      is_removed: c.is_removed,
      created_at: toISOStringSafe(c.created_at),
    })),
  };
}
