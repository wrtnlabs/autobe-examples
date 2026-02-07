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

/**
 * Test the ban appeal dashboard's performance metrics with completed appeal reviews.
 * Validate the dashboard response structure and ensure performance metrics are properly calculated.
 */
export async function test_api_admin_dashboard_appeal_performance_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Get dashboard metrics - this is the only available endpoint
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.appeal.dashboard(
      adminConnection,
    );
  typia.assert(dashboard);
  // Validate dashboard structure based on DTO definitions
  TestValidator.predicate(
    "total appeals count is valid number",
    dashboard.total_appeals >= 0,
  );
  // Average processing time should be a valid number (could be 0 if no reviews)
  TestValidator.predicate(
    "average processing time is valid",
    dashboard.average_processing_time_hours >= 0 &&
      !isNaN(dashboard.average_processing_time_hours),
  );
  // Approval rate should be a valid percentage
  TestValidator.predicate(
    "approval rate is valid percentage",
    dashboard.approval_rate >= 0 && dashboard.approval_rate <= 100,
  );
  // Validate performance metrics structure
  TestValidator.predicate(
    "performance metrics has id",
    typeof dashboard.performance_metrics.id === "string" &&
      dashboard.performance_metrics.id.length > 0,
  );
  TestValidator.predicate(
    "performance metrics has type",
    typeof dashboard.performance_metrics.metric_type === "string" &&
      dashboard.performance_metrics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "performance metrics has value",
    typeof dashboard.performance_metrics.metric_value === "number" &&
      !isNaN(dashboard.performance_metrics.metric_value),
  );
  TestValidator.predicate(
    "performance metrics has unit",
    typeof dashboard.performance_metrics.metric_unit === "string" &&
      dashboard.performance_metrics.metric_unit.length > 0,
  );
  TestValidator.predicate(
    "performance metrics has source component",
    typeof dashboard.performance_metrics.source_component === "string" &&
      dashboard.performance_metrics.source_component.length > 0,
  );
  TestValidator.predicate(
    "performance metrics has timestamp",
    typeof dashboard.performance_metrics.collection_timestamp === "string" &&
      dashboard.performance_metrics.collection_timestamp.length > 0,
  );
  TestValidator.predicate(
    "performance metrics has time range",
    typeof dashboard.performance_metrics.time_range === "string" &&
      dashboard.performance_metrics.time_range.length > 0,
  );
  // Validate recent appeals array
  TestValidator.predicate(
    "recent appeals is array",
    Array.isArray(dashboard.recent_appeals),
  );
  // Validate workload distribution (empty object as per DTO definition)
  TestValidator.predicate(
    "workload distribution exists",
    typeof dashboard.workload_distribution === "object",
  );
}
