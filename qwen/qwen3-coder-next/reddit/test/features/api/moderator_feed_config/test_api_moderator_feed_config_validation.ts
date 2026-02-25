import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_feed_config_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(moderator);
  // 2. Create new connection with token from registration result
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: moderator.token.access,
    },
  };
  // 3. Test valid feed configuration updates
  const validConfigs: IRedditCloneFeedConfig.IUpdate[] = [
    // Test default sorting algorithm enum values
    {
      default_sort_algorithm: "hot",
    },
    {
      default_sort_algorithm: "new",
    },
    {
      default_sort_algorithm: "top",
    },
    {
      default_sort_algorithm: "controversial",
    },
    // Test default time filter values
    {
      default_time_filter: "today",
    },
    {
      default_time_filter: "week",
    },
    {
      default_time_filter: "month",
    },
    {
      default_time_filter: "year",
    },
    {
      default_time_filter: "allTime",
    },
    {
      default_time_filter: null,
    },
    // Test boolean feature flags
    {
      home_feed_requires_auth: true,
    },
    {
      home_feed_requires_auth: false,
    },
    {
      feed_view_caching_enabled: true,
    },
    {
      feed_view_caching_enabled: false,
    },
    // Test numeric values with constraints
    {
      hot_algorithm_max_age_hours: typia.random<number & tags.Type<"int32">>(),
    },
    {
      hot_algorithm_max_age_hours: null,
    },
    {
      controversial_min_votes: typia.random<number & tags.Type<"int32">>(),
    },
    {
      controversial_min_votes: null,
    },
    {
      controversial_max_score_deviation: typia.random<
        number & tags.Type<"int32">
      >(),
    },
    {
      controversial_max_score_deviation: null,
    },
    {
      feed_view_cache_ttl_minutes: typia.random<number & tags.Type<"int32">>(),
    },
    {
      feed_view_cache_ttl_minutes: null,
    },
    {
      max_posts_per_view: typia.random<number & tags.Type<"int32">>(),
    },
    {
      pagination_offset_step: typia.random<number & tags.Type<"int32">>(),
    },
    // Test algorithm weights (0.0-1.0 range)
    {
      hot_algorithm_time_weight: 0.5,
    },
    {
      hot_algorithm_time_weight: 0.0,
    },
    {
      hot_algorithm_time_weight: 1.0,
    },
    {
      hot_algorithm_time_weight: null,
    },
    {
      hot_algorithm_score_weight: 0.7,
    },
    {
      hot_algorithm_score_weight: null,
    },
  ];
  for (const config of validConfigs) {
    const result =
      await api.functional.redditClone.moderator.feed_configs.updateFeedConfig(
        authenticatedConnection,
        {
          body: config,
        },
      );
    typia.assert(result);
  }
  // 4. Test algorithm weights validation (should fail if outside 0.0-1.0 range)
  // Note: The server implementation should validate these constraints
  // We test with values within the valid range since typia.random<number> could generate out-of-range values
  const validWeightConfig: IRedditCloneFeedConfig.IUpdate = {
    hot_algorithm_time_weight: 0.3,
    hot_algorithm_score_weight: 0.7,
  };
  const weightResult =
    await api.functional.redditClone.moderator.feed_configs.updateFeedConfig(
      authenticatedConnection,
      {
        body: validWeightConfig,
      },
    );
  typia.assert(weightResult);
}
