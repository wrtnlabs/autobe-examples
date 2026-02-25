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

export async function test_api_moderator_feed_config_update(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Update feed configuration with valid parameters
  const updateData: IRedditCloneFeedConfig.IUpdate = {
    default_sort_algorithm: "hot",
    default_time_filter: "week",
    home_feed_requires_auth: true,
    hot_algorithm_max_age_hours: 720 satisfies number as number,
    hot_algorithm_time_weight: 0.5 satisfies number as number,
    hot_algorithm_score_weight: 0.5 satisfies number as number,
    controversial_min_votes: 5 satisfies number as number,
    controversial_max_score_deviation: 10 satisfies number as number,
    feed_view_caching_enabled: true,
    feed_view_cache_ttl_minutes: 30 satisfies number as number,
    max_posts_per_view: 50 satisfies number as number,
    pagination_offset_step: 20 satisfies number as number,
  };
  const updatedConfig =
    await api.functional.redditClone.moderator.feed_configs.updateFeedConfig(
      moderatorConnection,
      {
        body: updateData,
      },
    );
  typia.assert(updatedConfig);
  // Validate that all fields were updated correctly
  TestValidator.equals(
    "default sort algorithm",
    updatedConfig.defaultSortAlgorithm,
    "hot",
  );
  TestValidator.equals(
    "default time filter",
    updatedConfig.defaultTimeFilter,
    "week",
  );
  TestValidator.equals(
    "home feed requires auth",
    updatedConfig.homeFeedRequiresAuth,
    true,
  );
  TestValidator.equals(
    "hot algorithm max age hours",
    updatedConfig.hotAlgorithmMaxAgeHours,
    720 satisfies number as number,
  );
  TestValidator.equals(
    "hot algorithm time weight",
    updatedConfig.hotAlgorithmTimeWeight,
    0.5 satisfies number as number,
  );
  TestValidator.equals(
    "hot algorithm score weight",
    updatedConfig.hotAlgorithmScoreWeight,
    0.5 satisfies number as number,
  );
  TestValidator.equals(
    "controversial min votes",
    updatedConfig.controversialMinVotes,
    5 satisfies number as number,
  );
  TestValidator.equals(
    "controversial max score deviation",
    updatedConfig.controversialMaxScoreDeviation,
    10 satisfies number as number,
  );
  TestValidator.equals(
    "feed view caching enabled",
    updatedConfig.feedViewCachingEnabled,
    true,
  );
  TestValidator.equals(
    "feed view cache TTL minutes",
    updatedConfig.feedViewCacheTtlMinutes,
    30 satisfies number as number,
  );
  TestValidator.equals(
    "max posts per view",
    updatedConfig.maxPostsPerView,
    50 satisfies number as number,
  );
  TestValidator.equals(
    "pagination offset step",
    updatedConfig.paginationOffsetStep,
    20 satisfies number as number,
  );
}
