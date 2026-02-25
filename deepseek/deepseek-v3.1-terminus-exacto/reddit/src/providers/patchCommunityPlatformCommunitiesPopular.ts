import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformCommunitiesPopular(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  // Extract and validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const search = props.body.search?.trim();
  // Validate limit range
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Calculate pagination values
  const skip = (page - 1) * limit;
  // Build base where clause for communities
  const whereInput = {
    deleted_at: null,
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
  } satisfies Prisma.community_platform_communitiesWhereInput;
  // Create multi-criteria sorting per specification
  const orderByInput = [
    // Primary: subscriber count descending
    { statistic: { subscriber_count: "desc" as const } },
    // Secondary: daily active users descending
    { statistic: { daily_active_users: "desc" as const } },
    // Tertiary: post count descending
    { statistic: { post_count: "desc" as const } },
    // Final: community creation date descending
    { created_at: "desc" as const },
  ] satisfies Prisma.community_platform_communitiesOrderByWithRelationInput[];
  // Execute data query with proper select
  const data = await MyGlobal.prisma.community_platform_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      created_at: true,
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          karma: true,
          created_at: true,
        },
      } satisfies Prisma.community_platform_usersFindManyArgs,
      statistic: {
        select: {
          subscriber_count: true,
          post_count: true,
          daily_active_users: true,
        },
      } satisfies Prisma.community_platform_community_statisticsFindManyArgs,
    },
  });
  // Execute count query
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where: whereInput,
  });
  // Transform data to DTO response format
  const transformedData = data.map(
    (community) =>
      ({
        id: community.id as string & tags.Format<"uuid">,
        name: community.name,
        description: community.description,
        icon_url: community.icon_url as (string & tags.Format<"uri">) | null,
        owner: {
          id: community.owner.id as string & tags.Format<"uuid">,
          username: community.owner.username,
          display_name: community.owner.display_name,
          avatar_url: community.owner.avatar_url as
            | (string & tags.Format<"uri">)
            | null,
          karma: community.owner.karma,
          created_at: community.owner.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies ICommunityPlatformUser.ISummary,
        created_at: community.created_at.toISOString() as string &
          tags.Format<"date-time">,
      }) satisfies ICommunityPlatformCommunity.ISummary,
  );
  // Construct pagination metadata with safe calculation
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total > 0 ? Math.ceil(total / limit) : 0,
  } satisfies IPage.IPagination;
  // Return paginated response
  return {
    data: transformedData,
    pagination,
  } satisfies IPageICommunityPlatformCommunity.ISummary;
}
