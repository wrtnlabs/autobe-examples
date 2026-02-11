import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityFeedViewTransformer } from "../transformers/RedditPlatformCommunityFeedViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommunityViewsViewId(props: {
  viewId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityFeedView> {
  const view =
    await MyGlobal.prisma.reddit_platform_community_feed_views.findUnique({
      where: { id: props.viewId },
      ...RedditPlatformCommunityFeedViewTransformer.select(),
    });
  if (!view) throw new HttpException("Community feed view not found", 404);
  return await RedditPlatformCommunityFeedViewTransformer.transform(view);
}
