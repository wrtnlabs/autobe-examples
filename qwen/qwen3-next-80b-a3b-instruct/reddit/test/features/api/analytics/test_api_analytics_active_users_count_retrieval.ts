import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBBSAnalyticsActiveUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsActiveUsers";

export async function test_api_analytics_active_users_count_retrieval(
  connection: api.IConnection,
) {
  const activeUsersCount: ICommunityBBSAnalyticsActiveUsers =
    await api.functional.communityBBS.analytics.active_users.index(connection);
  typia.assert(activeUsersCount);
  TestValidator.predicate(
    "active users count should be a non-negative integer",
    activeUsersCount >= 0,
  );
}
