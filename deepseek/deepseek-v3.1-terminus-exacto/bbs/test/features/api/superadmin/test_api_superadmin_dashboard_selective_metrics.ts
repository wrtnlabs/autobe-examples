import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test dashboard retrieval with selective metric categories enabled/disabled.
 * Configure include_user_stats, include_content_stats, and include_performance_stats
 * flags to validate that the system correctly includes or excludes specific
 * metric categories. Verify that response contains only the requested metric types
 * and that JOIN operations are properly controlled by the flag settings.
 */
export async function test_api_superadmin_dashboard_selective_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: All flags enabled
  const dashboardAll =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboardAll);
  // Test 2: Only user stats enabled
  const dashboardUserOnly =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: false,
          include_performance_stats: false,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboardUserOnly);
  // Test 3: Only content stats enabled
  const dashboardContentOnly =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: false,
          include_content_stats: true,
          include_performance_stats: false,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboardContentOnly);
  // Test 4: Only performance stats enabled
  const dashboardPerformanceOnly =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: false,
          include_content_stats: false,
          include_performance_stats: true,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboardPerformanceOnly);
  // Test 5: No flags enabled (empty dashboard)
  const dashboardNone =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: false,
          include_content_stats: false,
          include_performance_stats: false,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboardNone);
  // Validate that different flag combinations produce different responses
  TestValidator.notEquals(
    "all flags vs user only should differ",
    dashboardAll,
    dashboardUserOnly,
  );
  TestValidator.notEquals(
    "all flags vs content only should differ",
    dashboardAll,
    dashboardContentOnly,
  );
  TestValidator.notEquals(
    "all flags vs performance only should differ",
    dashboardAll,
    dashboardPerformanceOnly,
  );
  TestValidator.notEquals(
    "user only vs content only should differ",
    dashboardUserOnly,
    dashboardContentOnly,
  );
}
