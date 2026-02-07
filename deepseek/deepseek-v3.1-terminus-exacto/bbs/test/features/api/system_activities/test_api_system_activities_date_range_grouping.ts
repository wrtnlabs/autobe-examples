import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_activities_date_range_grouping(
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
  // Generate test date ranges
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  // Test 1: Date range filtering without grouping
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 2: Daily grouping
  const dailyGroupResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: "daily",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dailyGroupResponse);
  // Test 3: Weekly grouping
  const weeklyGroupResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: "weekly",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(weeklyGroupResponse);
  // Test 4: Monthly grouping
  const monthlyGroupResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          group_by: "monthly",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(monthlyGroupResponse);
  // Test empty date range
  const futureStartDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const futureEndDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Day after tomorrow
  const emptyRangeResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: futureStartDate.toISOString(),
          end_date: futureEndDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  TestValidator.equals(
    "empty range has zero records",
    emptyRangeResponse.pagination.records,
    0,
  );
}
