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
import { RedditCloneFeedViewCollector } from "../collectors/RedditCloneFeedViewCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneFeedViewTransformer } from "../transformers/RedditCloneFeedViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneOwnerFeedViews(props: {
  owner: OwnerPayload;
  body: IRedditCloneFeedView.ICreate;
}): Promise<IRedditCloneFeedView> {
  const created = await MyGlobal.prisma.reddit_clone_feed_views.create({
    data: await RedditCloneFeedViewCollector.collect({ body: props.body }),
    ...RedditCloneFeedViewTransformer.select(),
  });
  return await RedditCloneFeedViewTransformer.transform(created);
}
