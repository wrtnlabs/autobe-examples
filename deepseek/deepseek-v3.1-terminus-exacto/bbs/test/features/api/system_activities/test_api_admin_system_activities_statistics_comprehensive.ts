import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the comprehensive system activities statistics functionality for administrators.
 */
export async function test_api_admin_system_activities_statistics_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test with basic parameters (default date range)
  const basicStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(basicStats);
  // Test with daily grouping
  const dailyStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          group_by: "daily",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dailyStats);
  TestValidator.equals("daily period", dailyStats.period, "daily");
  // Test with weekly grouping
  const weeklyStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          group_by: "weekly",
          limit: 3,
          page: 1,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(weeklyStats);
  TestValidator.equals("weekly period", weeklyStats.period, "weekly");
  // Test with monthly grouping
  const monthlyStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          group_by: "monthly",
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(monthlyStats);
  TestValidator.equals("monthly period", monthlyStats.period, "monthly");
  // Test pagination
  const paginatedStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          limit: 2,
          page: 2,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(paginatedStats);
  // Validate response structure
  TestValidator.predicate(
    "has total activities",
    basicStats.total_activities >= 0,
  );
  TestValidator.predicate("has success count", basicStats.success_count >= 0);
  TestValidator.predicate("has error count", basicStats.error_count >= 0);
  TestValidator.predicate(
    "has success rate",
    basicStats.success_rate >= 0 && basicStats.success_rate <= 100,
  );
  TestValidator.predicate("has period", basicStats.period.length > 0);
  TestValidator.predicate(
    "has valid dates",
    new Date(basicStats.start_date) <= new Date(basicStats.end_date),
  );
  TestValidator.predicate(
    "has comparison data",
    basicStats.previous_period_comparison !== undefined,
  );
  // Validate trend comparison structure
  const comparison = basicStats.previous_period_comparison;
  TestValidator.predicate(
    "has total activities change",
    typeof comparison.total_activities_change === "number",
  );
  TestValidator.predicate(
    "has success rate change",
    typeof comparison.success_rate_change === "number",
  );
  TestValidator.predicate(
    "has valid trend direction",
    comparison.trend_direction === "improving" ||
      comparison.trend_direction === "declining" ||
      comparison.trend_direction === "stable",
  );
}
