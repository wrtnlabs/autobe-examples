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

export async function test_api_admin_dashboard_appeal_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Access the ban appeal dashboard
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.appeal.dashboard(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validate empty state metrics
  TestValidator.equals("total_appeals should be 0", dashboard.total_appeals, 0);
  TestValidator.equals(
    "average_processing_time_hours should be 0",
    dashboard.average_processing_time_hours,
    0,
  );
  TestValidator.equals("approval_rate should be 0", dashboard.approval_rate, 0);
  TestValidator.equals(
    "recent_appeals array should be empty",
    dashboard.recent_appeals.length,
    0,
  );
  // Validate that recent_appeals is actually empty array
  TestValidator.predicate(
    "recent_appeals should be empty array",
    () =>
      Array.isArray(dashboard.recent_appeals) &&
      dashboard.recent_appeals.length === 0,
  );
  // Validate workload distribution exists (empty object as defined in DTO)
  typia.assert(dashboard.workload_distribution);
  // Validate performance metrics exist (with ID required by DTO)
  typia.assert(dashboard.performance_metrics);
  TestValidator.predicate(
    "performance_metrics should have an id",
    () => typeof dashboard.performance_metrics.id === "string",
  );
}
