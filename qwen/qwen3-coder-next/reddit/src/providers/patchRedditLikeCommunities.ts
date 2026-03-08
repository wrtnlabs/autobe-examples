import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunities(props: {
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_like_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search.toLowerCase() },
    }),
  };
  // Build order by clause
  const orderBy: Prisma.reddit_like_communitiesOrderByWithRelationInput =
    props.body.sort === "subscribers"
      ? { subscriptions: { _count: "desc" } }
      : props.body.sort === "newest"
        ? { created_at: "desc" }
        : { name: "asc" };
  // Execute queries
  const communities = await MyGlobal.prisma.reddit_like_communities.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditLikeCommunityAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      communities,
      RedditLikeCommunityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
