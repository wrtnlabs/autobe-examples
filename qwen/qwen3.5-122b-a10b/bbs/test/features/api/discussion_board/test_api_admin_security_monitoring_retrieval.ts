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

/**
 * Test administrator security monitoring retrieval.
 * Administrator retrieves comprehensive security monitoring data for the discussion board platform.
 */
export async function test_api_admin_security_monitoring_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare security monitoring request with date range and pagination
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const monitoringData =
    await api.functional.discussionBoard.admin.monitoring.security.index(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSecurityMonitoring.IRequest,
      },
    );
  typia.assert(monitoringData);
  // 3. Validate business logic - pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    monitoringData.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    monitoringData.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    monitoringData.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    monitoringData.pagination.pages >= 0,
  );
  // 4. Validate business logic - security metrics
  if (monitoringData.data.length > 0) {
    const record = monitoringData.data[0];
    TestValidator.predicate(
      "failed_login_count non-negative",
      record.failed_login_count >= 0,
    );
    TestValidator.predicate(
      "active_ban_count non-negative",
      record.active_ban_count >= 0,
    );
    // 5. Validate authentication metrics business logic
    TestValidator.predicate(
      "login_success_count non-negative",
      record.authentication_metrics.login_success_count >= 0,
    );
    TestValidator.predicate(
      "login_failure_count non-negative",
      record.authentication_metrics.login_failure_count >= 0,
    );
    TestValidator.predicate(
      "login_success_rate valid range",
      record.authentication_metrics.login_success_rate >= 0 &&
        record.authentication_metrics.login_success_rate <= 100,
    );
    TestValidator.predicate(
      "login_failure_rate valid range",
      record.authentication_metrics.login_failure_rate >= 0 &&
        record.authentication_metrics.login_failure_rate <= 100,
    );
    TestValidator.predicate(
      "unique_login_ips non-negative",
      record.authentication_metrics.unique_login_ips >= 0,
    );
    TestValidator.predicate(
      "peak_login_hour valid",
      record.authentication_metrics.peak_login_hour >= 0 &&
        record.authentication_metrics.peak_login_hour <= 23,
    );
    TestValidator.predicate(
      "average_logins_per_day non-negative",
      record.authentication_metrics.average_logins_per_day >= 0,
    );
  }
}
