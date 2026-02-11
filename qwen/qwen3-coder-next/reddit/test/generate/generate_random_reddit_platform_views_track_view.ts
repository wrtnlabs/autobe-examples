import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_feed_view } from "../prepare/prepare_random_reddit_platform_feed_view";

export async function generate_random_reddit_platform_views_track_view(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformFeedView.ICreate> | undefined;
  },
): Promise<IRedditPlatformFeedView> {
  const prepared: IRedditPlatformFeedView.ICreate =
    prepare_random_reddit_platform_feed_view(props.body);
  return await api.functional.redditPlatform.views.trackView(connection, {
    body: prepared,
  });
}
