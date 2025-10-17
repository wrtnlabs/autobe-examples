import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityLog";

/**
 * Test security audit log retrieval for monitoring authentication events.
 *
 * This test validates the complete workflow of security log access and
 * filtering:
 *
 * 1. Create and authenticate an administrator account
 * 2. Query security logs filtering by authentication event types
 * 3. Validate comprehensive security event details in the response
 * 4. Verify pagination and data structure integrity
 */
export async function test_api_security_logs_authentication_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to access security audit logs
  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(administrator);

  // Step 2: Query security logs with authentication event type filters
  const authEventTypes = [
    "login_success",
    "login_failed",
    "account_locked",
  ] as const;
  const selectedEventType = RandomGenerator.pick(authEventTypes);

  const securityLogRequest = {
    event_type: selectedEventType,
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const securityLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: securityLogRequest,
      },
    );
  typia.assert(securityLogsPage);

  // Step 3: Validate that logs can be retrieved and paginated
  if (securityLogsPage.data.length > 0) {
    const firstLog = securityLogsPage.data[0];
    typia.assert(firstLog);
  }

  // Step 4: Test filtering with different severity levels
  const severityLevels = ["low", "medium", "high", "critical"] as const;
  const selectedSeverity = RandomGenerator.pick(severityLevels);

  const severityFilterRequest = {
    severity: selectedSeverity,
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const severityFilteredLogs: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: severityFilterRequest,
      },
    );
  typia.assert(severityFilteredLogs);

  // Step 5: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const dateRangeFilteredLogs: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeFilteredLogs);

  // Step 6: Test combined filtering with event type and IP address
  const ipFilterRequest = {
    event_type: "login_failed",
    ip_address: "192.168.1.1",
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const ipFilteredLogs: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: ipFilterRequest,
      },
    );
  typia.assert(ipFilteredLogs);
}
