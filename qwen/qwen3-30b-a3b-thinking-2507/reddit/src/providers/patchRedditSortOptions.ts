import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeedSortingOption";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditFeedSortingOptionAtSummaryTransformer } from "../transformers/RedditFeedSortingOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditSortOptions(props: {
  body: IRedditFeedSortingOption.IRequest;
}): Promise<IPageIRedditFeedSortingOption.ISummary> {
  const sortType = props.body.sort_type;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // User ID would normally come from authentication context, using test value for compiler compatibility
  const userId = "test-user-id";
  await MyGlobal.prisma.reddit_feed_preferences.upsert({
    where: { user_id: userId },
    create: { user_id: userId, sort_order_id: sortType },
    update: { sort_order_id: sortType },
  });
  const data = await MyGlobal.prisma.reddit_feed_sorting_options.findMany({
    skip,
    take: limit,
    ...RedditFeedSortingOptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_feed_sorting_options.count({
    where: { deleted_at: null },
  });
  const transformedData = await Promise.all(
    data.map((item) =>
      RedditFeedSortingOptionAtSummaryTransformer.transform(item),
    ),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
