import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_appeal_mixed_statuses(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register administrator for dashboard access
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
  // Note: The actual creation of ban appeals with mixed statuses would require
  // additional API endpoints that are not provided in the available SDK functions.
  // Based on the available APIs, we can only test the dashboard endpoint itself.
  // Access the ban appeal dashboard
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.appeal.dashboard(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validate dashboard structure
  TestValidator.equals(
    "dashboard has required properties",
    Object.keys(dashboard).sort(),
    [
      "appeals_by_status",
      "recent_appeals",
      "workload_distribution",
      "performance_metrics",
      "total_appeals",
      "average_processing_time_hours",
      "approval_rate",
    ].sort(),
  );
  // Validate total appeals is non-negative
  TestValidator.predicate(
    "total_appeals is non-negative",
    dashboard.total_appeals >= 0,
  );
  // Validate approval rate is valid percentage or null
  if (dashboard.approval_rate !== null) {
    TestValidator.predicate(
      "approval_rate is valid percentage",
      dashboard.approval_rate >= 0 && dashboard.approval_rate <= 100,
    );
  }
  // Validate recent appeals array
  if (dashboard.recent_appeals.length > 0) {
    typia.assert(dashboard.recent_appeals);
  }
  // Validate average processing time is non-negative or null
  if (dashboard.average_processing_time_hours !== null) {
    TestValidator.predicate(
      "average_processing_time_hours is non-negative",
      dashboard.average_processing_time_hours >= 0,
    );
  }
  // Validate workload distribution and performance metrics exist
  typia.assert(dashboard.workload_distribution);
  typia.assert(dashboard.performance_metrics);
}
