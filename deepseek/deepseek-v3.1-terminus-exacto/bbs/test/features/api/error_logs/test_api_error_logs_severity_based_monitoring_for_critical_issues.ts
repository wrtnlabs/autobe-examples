import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test error log monitoring focused on critical severity errors for system health assessment.
 * This scenario validates that super administrators can quickly identify and monitor critical
 * system errors that require immediate attention.
 */
export async function test_api_error_logs_severity_based_monitoring_for_critical_issues(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // 2. Search error logs filtering specifically for critical severity errors
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const errorLogsResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          severities: ["critical"],
          start_date: startDate,
          end_date: endDate,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(errorLogsResponse);
  // 3. Validate response contains only critical severity errors
  TestValidator.predicate(
    "response should contain data",
    errorLogsResponse.data.length >= 0,
  );
  // 4. Verify all returned errors are critical severity
  for (const errorLog of errorLogsResponse.data) {
    TestValidator.equals(
      "severity should be critical",
      errorLog.severity,
      "critical",
    );
    // 5. Validate timestamps are within the specified date range using proper date comparison
    const firstOccurred = new Date(errorLog.first_occurred_at).getTime();
    const lastOccurred = new Date(errorLog.last_occurred_at).getTime();
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    TestValidator.predicate(
      "first_occurred_at should be within date range",
      firstOccurred >= startTime && firstOccurred <= endTime,
    );
    TestValidator.predicate(
      "last_occurred_at should be within date range",
      lastOccurred >= startTime && lastOccurred <= endTime,
    );
    // 6. Validate error_count is positive
    TestValidator.predicate(
      "error_count should be positive",
      errorLog.error_count > 0,
    );
  }
  // 7. Validate pagination information
  TestValidator.predicate(
    "pagination should be valid",
    errorLogsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    errorLogsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page should be valid",
    errorLogsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be valid",
    errorLogsResponse.pagination.pages >= 0,
  );
}
