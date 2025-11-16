import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

export async function test_api_statistics_engagement_creation_trends(
  connection: api.IConnection,
) {
  // Retrieve engagement statistics
  const statistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(statistics);

  // Validate user creation metrics have proper hierarchical relationships
  TestValidator.predicate(
    "users created this week should be >= users created today",
    statistics.users_created_this_week >= statistics.users_created_today,
  );

  TestValidator.predicate(
    "users created this month should be >= users created this week",
    statistics.users_created_this_month >= statistics.users_created_this_week,
  );

  // Validate admin creation metrics have proper hierarchical relationships
  TestValidator.predicate(
    "admins created this week should be >= admins created today",
    statistics.admins_created_this_week >= statistics.admins_created_today,
  );

  TestValidator.predicate(
    "admins created this month should be >= admins created this week",
    statistics.admins_created_this_month >= statistics.admins_created_this_week,
  );

  // Verify all metrics are non-negative integers
  TestValidator.predicate(
    "users created today should be non-negative",
    statistics.users_created_today >= 0,
  );

  TestValidator.predicate(
    "users created this week should be non-negative",
    statistics.users_created_this_week >= 0,
  );

  TestValidator.predicate(
    "users created this month should be non-negative",
    statistics.users_created_this_month >= 0,
  );

  TestValidator.predicate(
    "admins created today should be non-negative",
    statistics.admins_created_today >= 0,
  );

  TestValidator.predicate(
    "admins created this week should be non-negative",
    statistics.admins_created_this_week >= 0,
  );

  TestValidator.predicate(
    "admins created this month should be non-negative",
    statistics.admins_created_this_month >= 0,
  );
}
