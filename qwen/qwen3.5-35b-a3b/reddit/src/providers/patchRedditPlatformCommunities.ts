import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunities(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereClause: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
  };
  if (
    props.body.searchQuery !== undefined &&
    props.body.searchQuery !== null &&
    props.body.searchQuery.trim().length > 0
  ) {
    whereClause.name = {
      contains: props.body.searchQuery.toLowerCase(),
      mode: "insensitive",
    };
  }
  const orderByInput: Prisma.reddit_platform_communitiesOrderByWithRelationInput[] =
    props.body.sortBy === "created_at"
      ? [
          {
            created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
          },
        ]
      : props.body.sortBy === "subscriber_count"
        ? [
            {
              subscriber_count: "desc",
            },
          ]
        : props.body.sortBy === "name"
          ? [
              {
                name: "asc",
              },
            ]
          : [
              {
                created_at: "desc",
              },
            ];
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereClause,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
