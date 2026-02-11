import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformIPagePopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformIPagePopularFeed";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformIPagePopularFeedAtSummaryTransformer } from "../transformers/RedditPlatformIPagePopularFeedAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPopular(): Promise<IRedditPlatformIPagePopularFeed.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { vote_score: "desc" },
    ...RedditPlatformIPagePopularFeedAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: { deleted_at: null },
  });
  const transformed =
    await RedditPlatformIPagePopularFeedAtSummaryTransformer.transform(
      data.length > 0 ? data[0] : ({} as any),
    );
  return {
    ...transformed,
    pagination: {
      ...transformed.pagination,
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
