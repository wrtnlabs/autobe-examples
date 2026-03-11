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

export async function patchRedditPlatformCommunitiesSearch(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const searchQuery = props.body.searchQuery?.trim();
  if (searchQuery) {
    const hasValidChars = /[a-zA-Z0-9\u4e00-\u9fa5]/.test(searchQuery);
    if (!hasValidChars) {
      throw new HttpException("Invalid search characters", 400);
    }
  }
  const sortOrderValue = (props.body.sortOrder ??
    (props.body.sortBy === "name" ? "asc" : "desc")) as "asc" | "desc";
  const orderByInput =
    props.body.sortBy === "name"
      ? { name: sortOrderValue }
      : props.body.sortBy === "created_at"
        ? { created_at: sortOrderValue }
        : { subscriber_count: sortOrderValue };
  const whereInput: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(searchQuery && {
      name: {
        contains: searchQuery,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.reddit_platform_communitiesWhereInput;
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
