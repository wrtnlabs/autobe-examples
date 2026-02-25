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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneFeedViewTransformer } from "../transformers/RedditCloneFeedViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneModeratorFeedViews(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneFeedView.ICreate;
}): Promise<IRedditCloneFeedView> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const feedConfigId = props.body.feed_config_id as string &
    tags.Format<"uuid">;
  const cacheKey = props.body.cache_key as string &
    tags.Pattern<"^[a-zA-Z0-9_-]+$">;
  const ttlSeconds = props.body.ttl_seconds as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const created = await MyGlobal.prisma.reddit_clone_feed_views.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      feed_config_id: feedConfigId,
      cache_key: cacheKey,
      ttl_seconds: ttlSeconds,
      is_stale: false,
      last_refreshed_at: null,
      last_content_updated_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      feedConfig: true,
    },
  });
  return await RedditCloneFeedViewTransformer.transform(created);
}
