import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_feed_views_create } from "../../../generate/generate_random_reddit_clone_moderator_feed_views_create";
import { prepare_random_reddit_clone_feed_view } from "../../../prepare/prepare_random_reddit_clone_feed_view";

export async function test_api_feed_view_caching_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 2. Create a new feed view
  const feedView = await api.functional.redditClone.moderator.feed_views.create(
    moderatorConnection,
    {
      body: {
        feed_config_id: typia.random<string & tags.Format<"uuid">>(),
        cache_key: `test_feed_${RandomGenerator.alphaNumeric(8)}`,
        ttl_seconds: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IRedditCloneFeedView.ICreate,
    },
  );
  typia.assert(feedView);
  // 3. Verify feed view can be retrieved
  const retrievedFeedView = await api.functional.redditClone.feed_views.at(
    moderatorConnection,
    {
      feedViewId: feedView.id,
    },
  );
  typia.assert(retrievedFeedView);
  // 4. Refresh the feed view cache
  const refreshResponse =
    await api.functional.redditClone.moderator.feed_views.refresh(
      moderatorConnection,
      {
        feedViewId: feedView.id,
      },
    );
  typia.assert(refreshResponse);
  TestValidator.equals(
    "refresh success message",
    refreshResponse.success,
    "refreshed",
  );
  TestValidator.equals(
    "feedViewId matches",
    refreshResponse.feedViewId,
    feedView.id,
  );
}
