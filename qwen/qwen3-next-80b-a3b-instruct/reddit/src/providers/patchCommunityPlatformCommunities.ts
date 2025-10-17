import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const {
    search,
    isPublic,
    isNsfw,
    sortBy = "memberCount",
    page = 1,
    limit = 50,
  } = props.body;

  // Calculate offset
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const where: any = {};

  // Full-text search on name and description
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // Filter by public status
  if (isPublic !== undefined) {
    where.is_public = isPublic;
  }

  // Filter by NSFW status
  if (isNsfw !== undefined) {
    where.nsfw = isNsfw;
  }

  // Build ORDER BY clause
  const orderBy: any = {};
  switch (sortBy) {
    case "memberCount":
      orderBy.member_count = "desc";
      break;
    case "postCount":
      orderBy.post_count = "desc";
      break;
    case "createdAt":
      orderBy.created_at = "desc";
      break;
    default:
      orderBy.member_count = "desc";
  }

  // Query total count
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where,
  });

  // Query data
  const data = await MyGlobal.prisma.community_platform_communities.findMany({
    where,
    orderBy,
    skip: offset,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      is_public: true,
      nsfw: true,
      member_count: true,
      post_count: true,
      created_at: true,
    },
  });

  // Convert all date fields to ISO strings
  const dataWithDates = data.map((item) => ({
    ...item,
    created_at: toISOStringSafe(item.created_at),
  }));

  // Return paginated response with satisfies to ensure type safety
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: dataWithDates,
  } satisfies IPageICommunityPlatformCommunity.ISummary;
}
