import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic where conditions
  const where: Record<string, unknown> = {
    // Exclude soft deleted posts
    deleted_at: null,
    ...(body.type !== undefined && { type: body.type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.community_id !== undefined && { community_id: body.community_id }),
    ...(body.user_id !== undefined && { user_id: body.user_id }),
    ...((body.created_after || body.created_before) && {
      created_at: {
        ...(body.created_after !== undefined && { gte: body.created_after }),
        ...(body.created_before !== undefined && { lte: body.created_before }),
      },
    }),
    ...(body.search !== undefined &&
      body.search.trim().length > 0 && {
        // Full text search by title or body using Prisma's contains (can use raw query for more advanced ft search)
        OR: [
          { title: { contains: body.search } },
          { body: { contains: body.search } },
        ],
      }),
  };

  const orderField = body.sort_by ?? "created_at";
  const orderDirection = body.sort_order ?? "desc";

  // Query in parallel for efficiency
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.findMany({
      where: where,
      skip: skip,
      take: limit,
      orderBy: { [orderField]: orderDirection },
      include: {
        community: true,
        user: true,
      },
    }),
    MyGlobal.prisma.community_platform_posts.count({ where: where }),
  ]);

  const data = posts.map((post: any) => ({
    id: post.id,
    community_id: post.community_id,
    community: post.community
      ? {
          id: post.community.id,
          name: post.community.name,
          display_title: post.community.display_title,
          description: post.community.description,
          visibility: post.community.visibility,
          image_url:
            post.community.image_url === null ? null : post.community.image_url,
          status: post.community.status,
        }
      : undefined,
    user_id: post.user_id,
    user: post.user
      ? {
          id: post.user.id,
        }
      : undefined,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
