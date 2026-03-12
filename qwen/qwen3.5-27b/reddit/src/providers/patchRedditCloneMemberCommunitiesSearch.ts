import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityAtSummaryTransformer } from "../transformers/RedditCloneCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesSearch(props: {
  member: MemberPayload;
  body: IRedditCloneCommunity.IRequest;
}): Promise<IPageIRedditCloneCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  // Build search condition - empty search returns all communities
  const searchTerm = props.body.search?.trim();
  const searchCondition =
    searchTerm && searchTerm.length > 0
      ? {
          name: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        }
      : {};
  // Build sort condition
  const sortField = props.body.sort ?? "name";
  const sortOrder = (props.body.order ?? "asc") as "asc" | "desc";
  let orderBy: Prisma.reddit_clone_communitiesOrderByWithRelationInput;
  if (sortField === "subscriberCount") {
    orderBy = { subscriber_count: sortOrder };
  } else if (sortField === "createdAt") {
    orderBy = { created_at: sortOrder };
  } else {
    orderBy = { name: sortOrder };
  }
  // Query data with pagination
  const data = await MyGlobal.prisma.reddit_clone_communities.findMany({
    where: {
      deleted_at: null,
      ...searchCondition,
    },
    skip,
    take: limit,
    orderBy,
    ...RedditCloneCommunityAtSummaryTransformer.select(),
  });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_communities.count({
    where: {
      deleted_at: null,
      ...searchCondition,
    },
  });
  // Transform database records to DTO format
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditCloneCommunityAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
