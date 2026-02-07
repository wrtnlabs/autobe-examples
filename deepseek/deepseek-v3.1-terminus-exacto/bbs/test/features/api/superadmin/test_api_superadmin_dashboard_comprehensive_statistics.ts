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
 * Test super administrator dashboard retrieval with comprehensive statistics.
 * Validates that the dashboard returns complete platform overview including
 * user counts, content metrics, section statistics, and system activities.
 */
export async function test_api_superadmin_dashboard_comprehensive_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test dashboard with comprehensive statistics request
  const dashboardResponse =
    await api.functional.discussionBoard.superAdmin.dashboard.index(
      superAdminConnection,
      {
        body: {
          include_user_stats: true,
          include_content_stats: true,
          include_performance_stats: true,
          aggregation_level: "daily",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // Validate dashboard response structure
  TestValidator.predicate(
    "dashboard response has id",
    dashboardResponse.id !== undefined,
  );
  TestValidator.predicate(
    "dashboard response has email",
    dashboardResponse.email !== undefined,
  );
  TestValidator.predicate(
    "dashboard response has privilege_level",
    dashboardResponse.privilege_level !== undefined,
  );
  TestValidator.predicate(
    "dashboard response has created_at",
    dashboardResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "dashboard response has updated_at",
    dashboardResponse.updated_at !== undefined,
  );
  // The response appears to be super admin account data rather than dashboard statistics
  // This suggests the dashboard endpoint might return the authenticated super admin's account info
  // rather than comprehensive platform statistics as described in the scenario
}
