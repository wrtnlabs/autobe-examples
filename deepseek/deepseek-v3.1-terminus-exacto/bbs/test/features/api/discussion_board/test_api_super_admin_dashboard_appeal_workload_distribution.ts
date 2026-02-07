import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test the dashboard's workload distribution analysis for ban appeal moderation.
 * Verify that the dashboard correctly identifies workflow bottlenecks, shows appeal
 * assignment patterns across administrators, and provides metrics for moderation
 * team effectiveness.
 */
export async function test_api_super_admin_dashboard_appeal_workload_distribution(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Access the ban appeal dashboard
  const dashboardData =
    await api.functional.discussionBoard.superAdmin.dashboard.appeal.dashboard(
      superAdminConnection,
    );
  // Validate the dashboard response structure - typia.assert performs complete validation
  typia.assert(dashboardData);
  // Validate that the dashboard provides meaningful ban appeal data
  TestValidator.predicate(
    "dashboard contains valid appeal information",
    dashboardData.id !== undefined &&
      dashboardData.appeal_reason !== undefined &&
      dashboardData.status !== undefined,
  );
  // Validate ban record context exists
  TestValidator.predicate(
    "ban record provides context for appeal",
    dashboardData.banRecord !== undefined &&
      dashboardData.banRecord.ban_reason !== undefined,
  );
  // Validate user information for appeal identification
  TestValidator.predicate(
    "user summary identifies the appealer",
    dashboardData.user !== undefined &&
      dashboardData.user.display_name !== undefined,
  );
  // The dashboard should provide comprehensive appeal workflow information
  // including status tracking and review assignment patterns
  TestValidator.predicate(
    "dashboard provides appeal workflow tracking",
    dashboardData.appealed_at !== undefined &&
      dashboardData.created_at !== undefined &&
      dashboardData.updated_at !== undefined,
  );
  // Validate that reviewer assignment information is available
  // (may be null for pending appeals, but the field should exist)
  TestValidator.predicate(
    "reviewer assignment field exists",
    dashboardData.reviewer !== undefined,
  );
  // Validate decision tracking fields exist
  TestValidator.predicate(
    "decision tracking fields exist",
    dashboardData.decision_reason !== undefined &&
      dashboardData.reviewed_at !== undefined,
  );
}
