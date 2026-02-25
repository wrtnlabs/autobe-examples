import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_feed_config_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Login as owner to get authorized connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: "owner@test.com",
    password: "SecurePass123!",
    username: "testowner",
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const loginResult = await authorize_owner_join(ownerConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // Create a new connection with the token from login result
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: loginResult.token.access,
    },
  };
  // Step 1: Get current feed configuration
  const currentConfig =
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      authorizedConnection,
    );
  typia.assert(currentConfig);
  // Step 2: Store original values for comparison
  const originalDefaultSortAlgorithm = currentConfig.defaultSortAlgorithm;
  const originalDefaultTimeFilter = currentConfig.defaultTimeFilter;
  const originalHomeFeedRequiresAuth = currentConfig.homeFeedRequiresAuth;
  // Step 3: Prepare partial update data - only changing some fields
  const partialUpdate = {
    defaultSortAlgorithm: "new" as const,
    homeFeedRequiresAuth: false,
  };
  // Step 4: Apply partial update
  const updatedConfig =
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      authorizedConnection,
    );
  typia.assert(updatedConfig);
  // Step 5: Validate that only specified fields were changed
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
  // Step 6: Validate that unspecified fields retained their original values
  TestValidator.equals(
    "defaultTimeFilter unchanged",
    updatedConfig.defaultTimeFilter,
    originalDefaultTimeFilter,
  );
  // Note: hotAlgorithmMaxAgeHours, hotAlgorithmTimeWeight, etc. may be null in the initial config
  // and should retain their original values after partial update
  TestValidator.equals(
    "hotAlgorithmMaxAgeHours unchanged",
    updatedConfig.hotAlgorithmMaxAgeHours,
    currentConfig.hotAlgorithmMaxAgeHours,
  );
  TestValidator.equals(
    "hotAlgorithmTimeWeight unchanged",
    updatedConfig.hotAlgorithmTimeWeight,
    currentConfig.hotAlgorithmTimeWeight,
  );
  TestValidator.equals(
    "hotAlgorithmScoreWeight unchanged",
    updatedConfig.hotAlgorithmScoreWeight,
    currentConfig.hotAlgorithmScoreWeight,
  );
  TestValidator.equals(
    "controversialMinVotes unchanged",
    updatedConfig.controversialMinVotes,
    currentConfig.controversialMinVotes,
  );
  TestValidator.equals(
    "controversialMaxScoreDeviation unchanged",
    updatedConfig.controversialMaxScoreDeviation,
    currentConfig.controversialMaxScoreDeviation,
  );
  TestValidator.equals(
    "feedViewCachingEnabled unchanged",
    updatedConfig.feedViewCachingEnabled,
    currentConfig.feedViewCachingEnabled,
  );
  TestValidator.equals(
    "feedViewCacheTtlMinutes unchanged",
    updatedConfig.feedViewCacheTtlMinutes,
    currentConfig.feedViewCacheTtlMinutes,
  );
  TestValidator.equals(
    "maxPostsPerView unchanged",
    updatedConfig.maxPostsPerView,
    currentConfig.maxPostsPerView,
  );
  TestValidator.equals(
    "paginationOffsetStep unchanged",
    updatedConfig.paginationOffsetStep,
    currentConfig.paginationOffsetStep,
  );
  // Step 7: Verify timestamp fields were updated
  TestValidator.predicate(
    "updatedAt is recent",
    updatedConfig.updatedAt > currentConfig.updatedAt,
  );
}
