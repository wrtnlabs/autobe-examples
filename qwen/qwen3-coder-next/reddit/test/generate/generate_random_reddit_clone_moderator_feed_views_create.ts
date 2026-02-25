import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_feed_view } from "../prepare/prepare_random_reddit_clone_feed_view";

export async function generate_random_reddit_clone_moderator_feed_views_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneFeedView.ICreate>;
  },
): Promise<IRedditCloneFeedView> {
  const prepared: IRedditCloneFeedView.ICreate =
    prepare_random_reddit_clone_feed_view(props.body);
  const result: IRedditCloneFeedView =
    await api.functional.redditClone.moderator.feed_views.create(connection, {
      body: prepared,
    });
  return result;
}
