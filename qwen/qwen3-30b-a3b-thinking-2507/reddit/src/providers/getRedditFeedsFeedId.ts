import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditFeedTransformer } from "../transformers/RedditFeedTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditFeedsFeedId(props: {
  feedId: string & tags.Format<"uuid">;
}): Promise<IRedditFeed> {
  const feed = await MyGlobal.prisma.reddit_feeds.findUniqueOrThrow({
    where: {
      id: props.feedId,
      deleted_at: null,
    },
    ...RedditFeedTransformer.select(),
  });
  return await RedditFeedTransformer.transform(feed);
}
