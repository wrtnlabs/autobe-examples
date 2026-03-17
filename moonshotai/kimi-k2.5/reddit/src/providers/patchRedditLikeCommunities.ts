import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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
  const sort = props.body.sort ?? "name";
  const search = props.body.search;
  // Build where clause for filtering
  const whereInput: Prisma.reddit_like_communitiesWhereInput = {
    deleted_at: null,
    ...(search && {
      name: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
  };
  // Fetch paginated communities
  const communities = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy:
      sort === "subscriber_count"
        ? {
            subscriptions: {
              _count: "desc",
            },
          }
        : {
            name: "asc",
          },
    ...RedditLikeCommunityAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_communities.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    communities,
    RedditLikeCommunityAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
