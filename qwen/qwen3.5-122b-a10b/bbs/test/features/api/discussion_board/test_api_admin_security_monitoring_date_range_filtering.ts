import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthenticationMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthenticationMetric";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRangePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRangePeriod";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSecurityMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityMonitoring";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityMonitoring";
import type { ISecurityAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ISecurityAlert";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_security_monitoring_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create date range for filtering (last 7 days)
  const now = new Date();
  const startDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
  const endDate = now;
  // 3. Query security monitoring with date range filtering
  const monitoringResponse =
    await api.functional.discussionBoard.admin.monitoring.security.index(
      adminConnection,
      {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSecurityMonitoring.IRequest,
      },
    );
  typia.assert(monitoringResponse);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    monitoringResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is positive",
    monitoringResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    monitoringResponse.pagination.limit >= 1,
  );
  // 5. Validate data array exists and has content
  TestValidator.predicate(
    "has data array",
    Array.isArray(monitoringResponse.data),
  );
  TestValidator.predicate(
    "data array is not empty",
    monitoringResponse.data.length > 0,
  );
  // 6. Validate first monitoring record structure
  const firstRecord = monitoringResponse.data[0];
  TestValidator.predicate(
    "has failed_login_count",
    typeof firstRecord.failed_login_count === "number",
  );
  TestValidator.predicate(
    "failed_login_count is non-negative",
    firstRecord.failed_login_count >= 0,
  );
  TestValidator.predicate(
    "has failed_logins_by_ip",
    typeof firstRecord.failed_logins_by_ip === "object",
  );
  TestValidator.predicate(
    "has active_ban_count",
    typeof firstRecord.active_ban_count === "number",
  );
  TestValidator.predicate(
    "active_ban_count is non-negative",
    firstRecord.active_ban_count >= 0,
  );
  TestValidator.predicate(
    "has recent_ban_activities",
    Array.isArray(firstRecord.recent_ban_activities),
  );
  TestValidator.predicate(
    "has security_events",
    Array.isArray(firstRecord.security_events),
  );
  TestValidator.predicate(
    "has suspicious_alerts",
    Array.isArray(firstRecord.suspicious_alerts),
  );
  TestValidator.predicate(
    "has authentication_metrics",
    firstRecord.authentication_metrics !== undefined,
  );
  TestValidator.predicate("has period", firstRecord.period !== undefined);
  // 7. Validate period matches requested date range
  TestValidator.equals(
    "period start matches request",
    firstRecord.period.start,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "period end matches request",
    firstRecord.period.end,
    endDate.toISOString(),
  );
  // 8. Validate authentication metrics structure
  const metrics = firstRecord.authentication_metrics;
  TestValidator.predicate(
    "has login_success_count",
    typeof metrics.login_success_count === "number",
  );
  TestValidator.predicate(
    "login_success_count is non-negative",
    metrics.login_success_count >= 0,
  );
  TestValidator.predicate(
    "has login_failure_count",
    typeof metrics.login_failure_count === "number",
  );
  TestValidator.predicate(
    "login_failure_count is non-negative",
    metrics.login_failure_count >= 0,
  );
  TestValidator.predicate(
    "has login_success_rate",
    typeof metrics.login_success_rate === "number",
  );
  TestValidator.predicate(
    "login_success_rate is between 0-100",
    metrics.login_success_rate >= 0 && metrics.login_success_rate <= 100,
  );
  TestValidator.predicate(
    "has login_failure_rate",
    typeof metrics.login_failure_rate === "number",
  );
  TestValidator.predicate(
    "login_failure_rate is between 0-100",
    metrics.login_failure_rate >= 0 && metrics.login_failure_rate <= 100,
  );
  TestValidator.predicate(
    "has failed_logins_by_ip",
    typeof metrics.failed_logins_by_ip === "object",
  );
  TestValidator.predicate(
    "has unique_login_ips",
    typeof metrics.unique_login_ips === "number",
  );
  TestValidator.predicate(
    "unique_login_ips is non-negative",
    metrics.unique_login_ips >= 0,
  );
  TestValidator.predicate(
    "has peak_login_hour",
    typeof metrics.peak_login_hour === "number",
  );
  TestValidator.predicate(
    "peak_login_hour is between 0-23",
    metrics.peak_login_hour >= 0 && metrics.peak_login_hour <= 23,
  );
  TestValidator.predicate(
    "has average_logins_per_day",
    typeof metrics.average_logins_per_day === "number",
  );
  TestValidator.predicate(
    "average_logins_per_day is non-negative",
    metrics.average_logins_per_day >= 0,
  );
}
