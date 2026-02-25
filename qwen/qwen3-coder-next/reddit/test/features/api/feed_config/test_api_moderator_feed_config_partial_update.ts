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

export async function test_api_moderator_feed_config_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Get current feed configuration
  const currentConfig =
    await api.functional.redditClone.moderator.feed_configs.updateFeedConfig(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(currentConfig);
  // 3. Update only specific parameters (partial update) - using snake_case for request
  const updateData: IRedditCloneFeedConfig.IUpdate = {
    default_sort_algorithm: "new",
    home_feed_requires_auth: false,
    max_posts_per_view: 50,
  };
  const updatedConfig =
    await api.functional.redditClone.moderator.feed_configs.updateFeedConfig(
      moderatorConnection,
      { body: updateData },
    );
  typia.assert(updatedConfig);
  // 4. Verify updated parameters have new values
  TestValidator.equals(
    "defaultSortAlgorithm updated",
    updatedConfig.defaultSortAlgorithm,
    "new",
  );
  TestValidator.equals(
    "homeFeedRequiresAuth updated",
    updatedConfig.homeFeedRequiresAuth,
    false,
  );
  TestValidator.equals(
    "maxPostsPerView updated",
    updatedConfig.maxPostsPerView,
    50,
  );
  // 5. Verify omitted parameters retained original values
  TestValidator.equals(
    "defaultTimeFilter retained",
    updatedConfig.defaultTimeFilter,
    currentConfig.defaultTimeFilter,
  );
  TestValidator.equals(
    "hotAlgorithmMaxAgeHours retained",
    updatedConfig.hotAlgorithmMaxAgeHours,
    currentConfig.hotAlgorithmMaxAgeHours,
  );
  TestValidator.equals(
    "feedViewCachingEnabled retained",
    updatedConfig.feedViewCachingEnabled,
    currentConfig.feedViewCachingEnabled,
  );
  TestValidator.equals(
    "paginationOffsetStep retained",
    updatedConfig.paginationOffsetStep,
    currentConfig.paginationOffsetStep,
  );
  // Additional test: Update more parameters to verify multiple partial updates work
  const secondUpdate: IRedditCloneFeedConfig.IUpdate = {
    default_time_filter: "month",
    feed_view_caching_enabled: true,
    feed_view_cache_ttl_minutes: 30,
  };
  const secondUpdatedConfig =
    await api.functional.redditClone.moderator.feed_configs.updateFeedConfig(
      moderatorConnection,
      { body: secondUpdate },
    );
  typia.assert(secondUpdatedConfig);
  // Verify new values are updated
  TestValidator.equals(
    "defaultTimeFilter updated",
    secondUpdatedConfig.defaultTimeFilter,
    "month",
  );
  TestValidator.equals(
    "feedViewCachingEnabled updated",
    secondUpdatedConfig.feedViewCachingEnabled,
    true,
  );
  TestValidator.equals(
    "feedViewCacheTtlMinutes updated",
    secondUpdatedConfig.feedViewCacheTtlMinutes,
    30,
  );
  // Verify previously updated values are retained
  TestValidator.equals(
    "defaultSortAlgorithm retained",
    secondUpdatedConfig.defaultSortAlgorithm,
    "new",
  );
  TestValidator.equals(
    "homeFeedRequiresAuth retained",
    secondUpdatedConfig.homeFeedRequiresAuth,
    false,
  );
  TestValidator.equals(
    "maxPostsPerView retained",
    secondUpdatedConfig.maxPostsPerView,
    50,
  );
  // Verify completely untouched parameters still retained original values
  TestValidator.equals(
    "hotAlgorithmMaxAgeHours still retained",
    secondUpdatedConfig.hotAlgorithmMaxAgeHours,
    currentConfig.hotAlgorithmMaxAgeHours,
  );
  TestValidator.equals(
    "paginationOffsetStep still retained",
    secondUpdatedConfig.paginationOffsetStep,
    currentConfig.paginationOffsetStep,
  );
}
