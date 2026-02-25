import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeed";
import { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditFeedAtSummaryTransformer } from "../transformers/RedditFeedAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditFeeds(props: {
  body: IRedditFeed.IRequest;
}): Promise<IPageIRedditFeed.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_feeds.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditFeedAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_feeds.count({
    where: { deleted_at: null },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditFeedAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
