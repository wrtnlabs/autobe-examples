import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_filtered_metrics(
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
  // Test 1: User stats only (exclude content stats)
  const userStatsOnly =
    await api.functional.discussionBoard.admin.dashboard.index(
      adminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: false,
          include_performance_stats: false,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(userStatsOnly);
  // Test 2: Weekly aggregation
  const weeklyAggregation =
    await api.functional.discussionBoard.admin.dashboard.index(
      adminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: false,
          include_performance_stats: false,
          aggregation_level: "weekly",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(weeklyAggregation);
  // Test 3: Monthly aggregation
  const monthlyAggregation =
    await api.functional.discussionBoard.admin.dashboard.index(
      adminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: false,
          include_performance_stats: false,
          aggregation_level: "monthly",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(monthlyAggregation);
  // Test 4: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFiltered =
    await api.functional.discussionBoard.admin.dashboard.index(
      adminConnection,
      {
        body: {
          start_date: oneWeekAgo.toISOString(),
          end_date: now.toISOString(),
          include_user_stats: true,
          include_content_stats: false,
          include_performance_stats: false,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  // Validate that all responses contain expected super admin structure
  TestValidator.predicate(
    "user stats only response has valid super admin structure",
    userStatsOnly.id !== undefined && userStatsOnly.email !== undefined,
  );
  TestValidator.predicate(
    "weekly aggregation response has valid super admin structure",
    weeklyAggregation.id !== undefined && weeklyAggregation.email !== undefined,
  );
  TestValidator.predicate(
    "monthly aggregation response has valid super admin structure",
    monthlyAggregation.id !== undefined &&
      monthlyAggregation.email !== undefined,
  );
  TestValidator.predicate(
    "date range filtered response has valid super admin structure",
    dateRangeFiltered.id !== undefined && dateRangeFiltered.email !== undefined,
  );
  // Test different filtering combinations
  // Test with content stats enabled
  const contentStatsEnabled =
    await api.functional.discussionBoard.admin.dashboard.index(
      adminConnection,
      {
        body: {
          include_user_stats: false,
          include_content_stats: true,
          include_performance_stats: false,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(contentStatsEnabled);
  TestValidator.predicate(
    "content stats enabled response has valid structure",
    contentStatsEnabled.id !== undefined &&
      contentStatsEnabled.email !== undefined,
  );
  // Test with all stats enabled
  const allStatsEnabled =
    await api.functional.discussionBoard.admin.dashboard.index(
      adminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(allStatsEnabled);
  TestValidator.predicate(
    "all stats enabled response has valid structure",
    allStatsEnabled.id !== undefined && allStatsEnabled.email !== undefined,
  );
}
