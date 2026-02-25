import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFeedViewTransformer } from "../transformers/RedditCloneFeedViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneFeedViewsFeedViewId(props: {
  feedViewId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneFeedView> {
  const feedView =
    await MyGlobal.prisma.reddit_clone_feed_views.findUniqueOrThrow({
      where: { id: props.feedViewId, deleted_at: null },
      ...RedditCloneFeedViewTransformer.select(),
    });
  return await RedditCloneFeedViewTransformer.transform(feedView);
}
