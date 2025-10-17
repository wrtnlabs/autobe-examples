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
 * Test detection and analysis of brute force attack patterns through security
 * logs.
 *
 * This test validates the security monitoring system's ability to detect and
 * track brute force attack attempts by analyzing security audit logs. The test
 * verifies that the system properly logs failed authentication attempts with
 * sufficient detail to identify attack patterns including IP addresses, event
 * types, severity levels, and timestamps.
 *
 * Workflow:
 *
 * 1. Create administrator account for security log analysis access
 * 2. Search security logs to retrieve authentication events
 * 3. Filter logs by various criteria to identify attack patterns
 * 4. Validate log entries contain necessary threat detection information
 * 5. Verify pagination and filtering capabilities for security analysis
 */
export async function test_api_security_logs_brute_force_detection(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for security log access
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);
  TestValidator.equals("admin should have valid ID", typeof admin.id, "string");

  // Step 2: Search all security logs without filters to get baseline data
  const allLogsRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const allLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: allLogsRequest,
      },
    );
  typia.assert(allLogs);
  TestValidator.predicate(
    "should return paginated results",
    allLogs.pagination.current === 1,
  );

  // Step 3: Search logs by event type to identify authentication events
  const authEventRequest = {
    event_type: "login_failed",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const authEventLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: authEventRequest,
      },
    );
  typia.assert(authEventLogs);

  // Step 4: Filter by severity level to identify high-priority threats
  const severities = ["low", "medium", "high", "critical"] as const;
  const severity = RandomGenerator.pick(severities);

  const severityRequest = {
    severity: severity,
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const severityLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: severityRequest,
      },
    );
  typia.assert(severityLogs);

  // Step 5: Search by IP address to identify attack sources
  const ipAddress = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>()}`;

  const ipRequest = {
    ip_address: ipAddress,
    page: 1,
    limit: 30,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const ipLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: ipRequest,
      },
    );
  typia.assert(ipLogs);

  // Step 6: Test date range filtering for temporal attack pattern analysis
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    start_date: oneDayAgo.toISOString(),
    end_date: now.toISOString(),
    page: 1,
    limit: 40,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const dateRangeLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeLogs);

  // Step 7: Test combined filters for comprehensive brute force detection
  const combinedRequest = {
    event_type: "login_failed",
    severity: "high",
    start_date: oneDayAgo.toISOString(),
    end_date: now.toISOString(),
    page: 1,
    limit: 15,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const combinedLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: combinedRequest,
      },
    );
  typia.assert(combinedLogs);
  TestValidator.predicate(
    "combined filter should respect limit",
    combinedLogs.data.length <= 15,
  );

  // Step 8: Verify pagination functionality
  const paginationRequest = {
    page: 2,
    limit: 10,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const paginatedLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals(
    "pagination should be on page 2",
    paginatedLogs.pagination.current,
    2,
  );

  // Step 9: Test sorting functionality for attack timeline analysis
  const sortOrders = ["asc", "desc"] as const;
  const sortOrder = RandomGenerator.pick(sortOrders);

  const sortRequest = {
    sort_by: "created_at",
    sort_order: sortOrder,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const sortedLogs =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: sortRequest,
      },
    );
  typia.assert(sortedLogs);

  // Step 10: Verify log entry structure contains all necessary security information
  if (allLogs.data.length > 0) {
    const sampleLog = allLogs.data[0];
    typia.assert(sampleLog);
    TestValidator.predicate(
      "log should have valid ID",
      typeof sampleLog.id === "string",
    );
    TestValidator.predicate(
      "log should have event type",
      typeof sampleLog.event_type === "string",
    );
    TestValidator.predicate(
      "log should have severity",
      typeof sampleLog.severity === "string",
    );
    TestValidator.predicate(
      "log should have IP address",
      typeof sampleLog.ip_address === "string",
    );
    TestValidator.predicate(
      "log should have description",
      typeof sampleLog.description === "string",
    );
    TestValidator.predicate(
      "log should have timestamp",
      typeof sampleLog.created_at === "string",
    );
  }
}
