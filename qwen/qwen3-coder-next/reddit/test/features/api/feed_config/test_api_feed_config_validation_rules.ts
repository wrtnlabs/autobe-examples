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

export async function test_api_feed_config_validation_rules(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection for authorization
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(3),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Test valid configuration update
  const validConfig: IRedditCloneFeedConfig = {
    id: typia.random<string & tags.Format<"uuid">>(),
    defaultSortAlgorithm: "hot",
    defaultTimeFilter: "week",
    homeFeedRequiresAuth: true,
    hotAlgorithmMaxAgeHours: 168 satisfies number as number,
    hotAlgorithmTimeWeight: 0.5,
    hotAlgorithmScoreWeight: 0.5,
    controversialMinVotes: 5 satisfies number as number,
    controversialMaxScoreDeviation: 10 satisfies number as number,
    feedViewCachingEnabled: true,
    feedViewCacheTtlMinutes: 30 satisfies number as number,
    maxPostsPerView: 50 satisfies number as number,
    paginationOffsetStep: 20 satisfies number as number,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updatedConfig =
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      ownerConnection,
    );
  typia.assert(updatedConfig);
  // 3. Test invalid configuration - invalid time filter
  await TestValidator.error("invalid time filter", async () => {
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      ownerConnection,
    );
  });
  // 4. Test invalid configuration - weight out of range
  await TestValidator.error("weight out of range", async () => {
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      ownerConnection,
    );
  });
  // 5. Test invalid configuration - weights don't sum to 1.0
  await TestValidator.error("invalid weight sum", async () => {
    await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
      ownerConnection,
    );
  });
  // 6. Test valid configuration with different time filters
  const validTimeFilters: IRedditCloneFeedConfig[] = [
    { ...validConfig, defaultTimeFilter: "today" },
    { ...validConfig, defaultTimeFilter: "month" },
    { ...validConfig, defaultTimeFilter: "year" },
    { ...validConfig, defaultTimeFilter: "allTime" },
    { ...validConfig, defaultTimeFilter: null },
  ];
  for (const config of validTimeFilters) {
    const result =
      await api.functional.redditClone.owner.feed_configs.updateFeedConfig(
        ownerConnection,
      );
    typia.assert(result);
  }
}
