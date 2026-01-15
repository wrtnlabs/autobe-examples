import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemOverview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_overview_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate by joining
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Retrieve the system overview dashboard using the authenticated admin connection
  const overview: ICommunityPlatformSystemOverview =
    await api.functional.communityPlatform.admin.dashboards.system.overview.at(
      adminConnection,
    );
  // Step 3: Validate the response structure and data types
  typia.assert(overview);
  // Step 4: Validate all numerical fields are non-negative
  TestValidator.predicate(
    "active_system_alerts_count is non-negative",
    overview.active_system_alerts_count >= 0,
  );
  TestValidator.predicate(
    "critical_system_alerts_count is non-negative",
    overview.critical_system_alerts_count >= 0,
  );
  TestValidator.predicate(
    "high_system_alerts_count is non-negative",
    overview.high_system_alerts_count >= 0,
  );
  TestValidator.predicate(
    "total_active_admin_sessions is non-negative",
    overview.total_active_admin_sessions >= 0,
  );
  TestValidator.predicate(
    "avg_admin_session_duration is non-negative",
    overview.avg_admin_session_duration >= 0,
  );
  TestValidator.predicate(
    "failed_email_notifications_count is non-negative",
    overview.failed_email_notifications_count >= 0,
  );
  TestValidator.predicate(
    "failed_push_notifications_count is non-negative",
    overview.failed_push_notifications_count >= 0,
  );
  TestValidator.predicate(
    "total_content_reports is non-negative",
    overview.total_content_reports >= 0,
  );
  TestValidator.predicate(
    "pending_reports is non-negative",
    overview.pending_reports >= 0,
  );
  TestValidator.predicate(
    "resolved_reports is non-negative",
    overview.resolved_reports >= 0,
  );
  TestValidator.predicate(
    "avg_resolution_time_hours is non-negative",
    overview.avg_resolution_time_hours >= 0,
  );
  TestValidator.predicate(
    "total_admin_moderation_actions is non-negative",
    overview.total_admin_moderation_actions >= 0,
  );
  TestValidator.predicate(
    "active_reports is non-negative",
    overview.active_reports >= 0,
  );
  TestValidator.predicate(
    "report_disputes_count is non-negative",
    overview.report_disputes_count >= 0,
  );
  TestValidator.predicate(
    "spam_report_ratio is non-negative",
    overview.spam_report_ratio >= 0,
  );
  TestValidator.predicate(
    "user_behavior_alerts_count is non-negative",
    overview.user_behavior_alerts_count >= 0,
  );
  TestValidator.predicate(
    "system_health_score is within range [0,100]",
    overview.system_health_score >= 0 && overview.system_health_score <= 100,
  );
}
