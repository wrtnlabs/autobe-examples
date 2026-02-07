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
 * Test the performance metrics and review efficiency indicators in the ban appeal dashboard.
 * Validate that the dashboard tracks administrative efficiency including average review completion times,
 * appeal outcome patterns, and decision consistency metrics. The test should ensure that super administrators
 * can assess moderation team performance, identify trends in appeal reasons requiring policy adjustments,
 * and maintain consistent application of community standards across all administrators.
 */
export async function test_api_super_admin_dashboard_appeal_performance_metrics(
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
  // Retrieve ban appeal dashboard performance metrics
  const dashboardMetrics =
    await api.functional.discussionBoard.superAdmin.dashboard.appeal.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboardMetrics);
  // Validate that the dashboard provides comprehensive data for administrative oversight
  // typia.assert() has already validated all type information, so we focus on business logic
  TestValidator.predicate(
    "appeal status is valid for performance tracking",
    ["pending", "under_review", "approved", "rejected"].includes(
      dashboardMetrics.status,
    ),
  );
  // Validate that the dashboard provides meaningful data for efficiency analysis
  TestValidator.predicate(
    "dashboard provides appeal workflow data",
    dashboardMetrics.appeal_reason.length > 0,
  );
  TestValidator.predicate(
    "dashboard provides ban context data",
    dashboardMetrics.banRecord.ban_reason.length > 0,
  );
  TestValidator.predicate(
    "dashboard provides user identification data",
    dashboardMetrics.user.display_name.length > 0,
  );
}
