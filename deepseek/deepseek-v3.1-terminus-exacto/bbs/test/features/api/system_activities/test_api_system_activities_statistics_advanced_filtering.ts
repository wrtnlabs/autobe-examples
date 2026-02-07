import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_activities_statistics_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by specific activity type with daily grouping
  const dailyStats =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      superAdminConnection,
      {
        body: {
          activity_type: "user_login",
          group_by: "daily",
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dailyStats);
  TestValidator.equals("daily grouping period", dailyStats.period, "daily");
  // Test 2: Filter by different activity type with weekly grouping
  const weeklyStats =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      superAdminConnection,
      {
        body: {
          activity_type: "article_create",
          group_by: "weekly",
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(weeklyStats);
  TestValidator.equals("weekly grouping period", weeklyStats.period, "weekly");
  // Test 3: Filter by activity type with monthly grouping
  const monthlyStats =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      superAdminConnection,
      {
        body: {
          activity_type: "comment_create",
          group_by: "monthly",
          start_date: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(monthlyStats);
  TestValidator.equals(
    "monthly grouping period",
    monthlyStats.period,
    "monthly",
  );
  // Test 4: Pagination with limit
  const paginatedStats =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(paginatedStats);
  // Test 5: No filters (all activities)
  const allStats =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      superAdminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(allStats);
  // Validate that statistics contain proper comparison metrics
  TestValidator.predicate(
    "has previous period comparison",
    allStats.previous_period_comparison !== undefined,
  );
  TestValidator.predicate(
    "has trend direction",
    allStats.previous_period_comparison.trend_direction !== undefined,
  );
}
