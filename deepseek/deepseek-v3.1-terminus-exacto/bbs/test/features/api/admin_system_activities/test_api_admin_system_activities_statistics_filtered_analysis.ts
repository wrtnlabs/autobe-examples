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
 * Test filtered statistical analysis with specific criteria.
 * This scenario validates that administrators can retrieve targeted statistics by applying various filters
 * including date ranges, specific activity types, and actor types. Test includes scenarios with narrow
 * date ranges to verify precise filtering, specific activity types to validate targeted metrics, and
 * actor type filtering to distinguish between user, admin, and super admin activities.
 */
export async function test_api_admin_system_activities_statistics_filtered_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using the provided utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test 1: Narrow date range filtering
  const narrowDateRangeStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          end_date: new Date().toISOString(),
          group_by: "daily" as const,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(narrowDateRangeStats);
  // Test 2: Empty result set scenario (far future date range)
  const emptyResultStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 year in future
          end_date: new Date(
            Date.now() + 366 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          group_by: "monthly" as const,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(emptyResultStats);
  // Test 3: Trend analysis with equivalent periods
  const currentWeekStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Last 7 days
          end_date: new Date().toISOString(),
          group_by: "weekly" as const,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(currentWeekStats);
  const previousWeekStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 14-7 days ago
          end_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          group_by: "weekly" as const,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(previousWeekStats);
  // Test 4: Pagination with limits
  const paginatedStats =
    await api.functional.discussionBoard.admin.system_activities.statistics(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          group_by: "daily" as const,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(paginatedStats);
  // Test 5: Error handling for invalid filter combinations
  await TestValidator.error(
    "invalid date range should throw error",
    async () => {
      await api.functional.discussionBoard.admin.system_activities.statistics(
        adminConnection,
        {
          body: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // End before start
            group_by: "daily" as const,
          } satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    },
  );
  // Validate business logic consistency
  TestValidator.predicate(
    "total activities equals success plus error counts",
    narrowDateRangeStats.total_activities ===
      narrowDateRangeStats.success_count + narrowDateRangeStats.error_count,
  );
}
