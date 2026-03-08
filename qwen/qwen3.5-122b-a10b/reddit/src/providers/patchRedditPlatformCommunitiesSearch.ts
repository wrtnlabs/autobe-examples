import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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

export async function patchRedditPlatformCommunitiesSearch(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const search = props.body.search;
  // Build where clause - exclude soft-deleted communities
  const whereInput = {
    deleted_at: null,
    ...(search && {
      name: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.reddit_platform_communitiesWhereInput;
  // Build order by clause based on sort parameter
  const orderByInput =
    props.body.sort === "subscriber_count"
      ? { subscriber_count: props.body.order ?? ("desc" as const) }
      : props.body.sort === "name"
        ? { name: props.body.order ?? ("asc" as const) }
        : { created_at: "desc" as const };
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  // Fetch paginated results
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  // Transform records and build response
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
  } satisfies IPageIRedditPlatformCommunity.ISummary;
}
