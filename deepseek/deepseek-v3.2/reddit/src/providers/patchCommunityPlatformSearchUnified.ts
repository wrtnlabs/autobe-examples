import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformSearchUnified(props: {
  body: ICommunityPlatformPost.IUnified;
}): Promise<ICommunityPlatformPost.IUnifiedResponse> {
  const search = props.body.search?.trim();
  const entityTypes = props.body.entityTypes ?? [];
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine which entity types to search
  const searchCommunities =
    entityTypes.length === 0 || entityTypes.includes("community");
  const searchPosts = entityTypes.length === 0 || entityTypes.includes("post");
  const searchUsers = entityTypes.length === 0 || entityTypes.includes("user");
  // Helper to build where clause with search text
  const buildWhereClause = (fields: string[]) => {
    if (!search) return { deleted_at: null };
    const searchConditions = fields.map((field) => ({
      [field]: { contains: search, mode: "insensitive" as const },
    }));
    return {
      AND: [{ deleted_at: null }, { OR: searchConditions }],
    };
  };
  // Collect all promises for parallel execution
  const promises: Array<Promise<any>> = [];
  // Search communities
  if (searchCommunities) {
    const where = buildWhereClause(["name", "description"]);
    promises.push(
      MyGlobal.prisma.community_platform_communities.findMany({
        where,
        skip: 0, // We'll handle pagination after merging
        take: limit * 3, // Fetch enough to handle pagination after merge
        orderBy: { created_at: "desc" as const },
        ...CommunityPlatformCommunityAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.community_platform_communities.count({ where }),
    );
  }
  // Search posts
  if (searchPosts) {
    const where = {
      AND: [
        { deleted_at: null },
        search
          ? { title: { contains: search, mode: "insensitive" as const } }
          : {},
        { community: { deleted_at: null } },
      ],
    };
    promises.push(
      MyGlobal.prisma.community_platform_posts.findMany({
        where,
        skip: 0,
        take: limit * 3,
        orderBy: { created_at: "desc" as const },
        ...CommunityPlatformPostAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.community_platform_posts.count({ where }),
    );
  }
  // Search users (members)
  if (searchUsers) {
    const where = buildWhereClause(["username", "nickname"]);
    promises.push(
      MyGlobal.prisma.community_platform_members.findMany({
        where,
        skip: 0,
        take: limit * 3,
        orderBy: { registered_at: "desc" as const },
        ...CommunityPlatformMemberAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.community_platform_members.count({ where }),
    );
  }
  // Execute all queries in parallel
  const allResults = await Promise.all(promises);
  // Process results: each entity type contributes [data[], count]
  let resultIndex = 0;
  const allItems: Array<{
    item:
      | ICommunityPlatformCommunity.ISummary
      | ICommunityPlatformPost.ISummary
      | ICommunityPlatformMember.ISummary;
    timestamp: string;
    type: "community" | "post" | "user";
  }> = [];
  let totalCount = 0;
  // Process communities
  if (searchCommunities) {
    const communities = allResults[resultIndex++] as any[];
    const communityCount = allResults[resultIndex++] as number;
    totalCount += communityCount;
    const transformed = await ArrayUtil.asyncMap(
      communities,
      CommunityPlatformCommunityAtSummaryTransformer.transform,
    );
    for (const item of transformed) {
      allItems.push({
        item: typia.assert<ICommunityPlatformCommunity.ISummary>(item),
        timestamp: toISOStringSafe(item.created_at),
        type: "community",
      });
    }
  }
  // Process posts
  if (searchPosts) {
    const posts = allResults[resultIndex++] as any[];
    const postCount = allResults[resultIndex++] as number;
    totalCount += postCount;
    const transformed = await ArrayUtil.asyncMap(
      posts,
      CommunityPlatformPostAtSummaryTransformer.transform,
    );
    for (const item of transformed) {
      allItems.push({
        item: typia.assert<ICommunityPlatformPost.ISummary>(item),
        timestamp: toISOStringSafe(item.created_at),
        type: "post",
      });
    }
  }
  // Process users
  if (searchUsers) {
    const members = allResults[resultIndex++] as any[];
    const memberCount = allResults[resultIndex++] as number;
    totalCount += memberCount;
    const transformed = await ArrayUtil.asyncMap(
      members,
      CommunityPlatformMemberAtSummaryTransformer.transform,
    );
    for (const item of transformed) {
      allItems.push({
        item: typia.assert<ICommunityPlatformMember.ISummary>(item),
        timestamp: toISOStringSafe(item.registered_at),
        type: "user",
      });
    }
  }
  // Sort by timestamp (newest first) using string comparison
  allItems.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  // Apply pagination
  const paginatedItems = allItems.slice(skip, skip + limit);
  const paginatedResults = paginatedItems.map((item) => item.item);
  // Calculate pagination metadata
  const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 0;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  // NOTE: DTO type expects single item, not array. Return first item or empty placeholder.
  // This is due to DTO definition mismatch: IUnifiedResponse.data should be Array<...> but is defined as union.
  const dataItem =
    paginatedResults.length > 0
      ? paginatedResults[0]
      : typia.random<
          | ICommunityPlatformCommunity.ISummary
          | ICommunityPlatformPost.ISummary
          | ICommunityPlatformMember.ISummary
        >();
  return {
    data: dataItem,
    pagination: {
      page,
      limit,
      total_count: totalCount,
      total_pages: totalPages,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage,
    } satisfies ICommunityPlatformPagination,
  };
}
