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

export async function test_api_feed_view_creation_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Test edge case 1: Minimum valid TTL (1 second)
  const edgeCase1 =
    await api.functional.redditClone.moderator.feed_views.create(
      moderatorConnection,
      {
        body: {
          feed_config_id: typia.random<string & tags.Format<"uuid">>(),
          cache_key: "edge_case_min_ttl" satisfies string &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">,
          ttl_seconds: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IRedditCloneFeedView.ICreate,
      },
    );
  typia.assert(edgeCase1);
  TestValidator.equals(
    "minimum TTL created successfully",
    edgeCase1.ttl_seconds,
    1,
  );
  // 3. Test edge case 2: Valid cache key with various characters
  const edgeCase2 =
    await api.functional.redditClone.moderator.feed_views.create(
      moderatorConnection,
      {
        body: {
          feed_config_id: typia.random<string & tags.Format<"uuid">>(),
          cache_key: "home_hot_today_v2" satisfies string &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">,
          ttl_seconds: 3600 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IRedditCloneFeedView.ICreate,
      },
    );
  typia.assert(edgeCase2);
  TestValidator.equals(
    "valid cache key created successfully",
    edgeCase2.cache_key,
    "home_hot_today_v2",
  );
  // 4. Test edge case 3: Maximum valid TTL (e.g., 30 days = 2592000 seconds)
  const edgeCase3 =
    await api.functional.redditClone.moderator.feed_views.create(
      moderatorConnection,
      {
        body: {
          feed_config_id: typia.random<string & tags.Format<"uuid">>(),
          cache_key: "edge_case_max_ttl" satisfies string &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">,
          ttl_seconds: 2592000 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IRedditCloneFeedView.ICreate,
      },
    );
  typia.assert(edgeCase3);
  TestValidator.equals(
    "maximum TTL created successfully",
    edgeCase3.ttl_seconds,
    2592000,
  );
  // 5. Test edge case 4: Very short TTL (10 seconds)
  const edgeCase4 =
    await api.functional.redditClone.moderator.feed_views.create(
      moderatorConnection,
      {
        body: {
          feed_config_id: typia.random<string & tags.Format<"uuid">>(),
          cache_key: "edge_case_short_ttl" satisfies string &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">,
          ttl_seconds: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IRedditCloneFeedView.ICreate,
      },
    );
  typia.assert(edgeCase4);
  TestValidator.equals(
    "very short TTL created successfully",
    edgeCase4.ttl_seconds,
    10,
  );
}
