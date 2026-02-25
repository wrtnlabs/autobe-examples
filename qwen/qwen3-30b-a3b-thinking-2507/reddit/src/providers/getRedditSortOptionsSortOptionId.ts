import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditFeedSortingOptionTransformer } from "../transformers/RedditFeedSortingOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditSortOptionsSortOptionId(props: {
  sortOptionId: string & tags.Format<"uuid">;
}): Promise<IRedditFeedSortingOption> {
  const record =
    await MyGlobal.prisma.reddit_feed_sorting_options.findUniqueOrThrow({
      where: { id: props.sortOptionId },
      ...RedditFeedSortingOptionTransformer.select(),
    });
  return await RedditFeedSortingOptionTransformer.transform(record);
}
