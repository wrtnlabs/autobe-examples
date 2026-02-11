import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformFeedViewCollector } from "../collectors/RedditPlatformFeedViewCollector";
import { RedditPlatformFeedViewTransformer } from "../transformers/RedditPlatformFeedViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformViews(props: {
  body: IRedditPlatformFeedView.ICreate;
}): Promise<IRedditPlatformFeedView> {
  const created = await MyGlobal.prisma.reddit_platform_feed_views.create({
    data: await RedditPlatformFeedViewCollector.collect({
      body: props.body,
    }),
    ...RedditPlatformFeedViewTransformer.select(),
  });
  return await RedditPlatformFeedViewTransformer.transform(created);
}
