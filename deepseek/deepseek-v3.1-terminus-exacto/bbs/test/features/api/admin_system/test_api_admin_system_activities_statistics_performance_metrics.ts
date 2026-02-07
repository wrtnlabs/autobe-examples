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
 * Test system performance metrics and platform health indicators.
 * This scenario focuses on validating the performance-related aspects of the statistics endpoint,
 * including success rate calculations, error trend analysis, and platform reliability metrics.
 * Test should verify that success rates are calculated accurately as (success_count / total_activities) * 100,
 * including handling of edge cases like zero activities. Validate that error trends are correctly identified
 * and that the trend direction (improving, declining, stable) is accurately determined based on performance metrics.
 * Ensure that the system properly handles large data sets through pagination and that performance remains
 * acceptable even with extensive historical data. Verify that the statistics provide actionable insights
 * for platform optimization and resource allocation decisions.
 */
export async function test_api_admin_system_activities_statistics_performance_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Test 1: Basic statistics with default parameters
  const basicStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(basicStats);
  // Validate success rate calculation (only test properties that exist in DTO)
  TestValidator.equals(
    "total activities sum",
    basicStats.total_activities,
    basicStats.success_count + basicStats.error_count,
  );
  if (basicStats.total_activities > 0) {
    const expectedSuccessRate =
      (basicStats.success_count / basicStats.total_activities) * 100;
    TestValidator.equals(
      "success rate calculation",
      basicStats.success_rate,
      expectedSuccessRate,
    );
  } else {
    TestValidator.equals(
      "success rate for zero activities",
      basicStats.success_rate,
      0,
    );
  }
  // Test 2: Statistics with date range filtering
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          group_by: "daily",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dateRangeStats);
  // Validate period grouping
  TestValidator.equals("period grouping", dateRangeStats.period, "daily");
  TestValidator.equals(
    "start date preserved",
    dateRangeStats.start_date,
    startDate,
  );
  TestValidator.equals("end date preserved", dateRangeStats.end_date, endDate);
  // Test 3: Statistics with pagination
  const paginatedStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(paginatedStats);
  // Test 4: Trend direction validation
  const validTrends = ["improving", "declining", "stable"] as const;
  TestValidator.predicate(
    "valid trend direction",
    validTrends.includes(
      basicStats.previous_period_comparison.trend_direction as any,
    ),
  );
  // Test 5: Empty statistics (edge case)
  const emptyStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Future date
          end_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Future date + 1 day
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(emptyStats);
  // Validate empty statistics
  TestValidator.equals(
    "zero total activities for future range",
    emptyStats.total_activities,
    0,
  );
  TestValidator.equals(
    "zero success count for future range",
    emptyStats.success_count,
    0,
  );
  TestValidator.equals(
    "zero error count for future range",
    emptyStats.error_count,
    0,
  );
  TestValidator.equals(
    "zero success rate for future range",
    emptyStats.success_rate,
    0,
  );
}
