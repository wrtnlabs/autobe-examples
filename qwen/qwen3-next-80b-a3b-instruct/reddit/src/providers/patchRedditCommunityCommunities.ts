import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Apply filters and sorting
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.reddit_community_communitiesWhereInput;
  const orderByInput = (
    props.body.sort === "popular"
      ? { subscriber_count: "desc" as const }
      : { name: "asc" as const }
  ) satisfies Prisma.reddit_community_communitiesOrderByWithRelationInput;
  // Fetch paginated data
  const data = await MyGlobal.prisma.reddit_community_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCommunityCommunityAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
