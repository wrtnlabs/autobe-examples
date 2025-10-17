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
 * Test tracking and analysis of rate limit violations for abuse detection.
 *
 * This test validates the administrator's ability to query and analyze security
 * logs specifically for rate limit violation events. The test ensures that rate
 * limit violations are properly logged with sufficient context to enable abuse
 * detection, including IP addresses, user identifiers, event severity, and
 * metadata.
 *
 * Step-by-step process:
 *
 * 1. Administrator registers and authenticates using the join endpoint
 * 2. Administrator queries security logs filtering by 'rate_limit_exceeded' event
 *    type
 * 3. Validate the response structure contains pagination information
 * 4. Verify that security log entries are properly typed and validated
 * 5. Test additional filtering options by severity level
 */
export async function test_api_security_logs_rate_limit_violation_tracking(
  connection: api.IConnection,
) {
  // Step 1: Administrator registers and authenticates
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuth);

  // Step 2: Administrator queries security logs filtering by rate_limit_exceeded event type
  const searchRequest = {
    event_type: "rate_limit_exceeded",
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const securityLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(securityLogsPage);

  // Step 3: Validate pagination information matches request
  TestValidator.equals(
    "pagination current page matches request",
    securityLogsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    securityLogsPage.pagination.limit,
    50,
  );

  // Step 4: Validate security log entries if present
  if (securityLogsPage.data.length > 0) {
    const sampleLog = securityLogsPage.data[0];
    typia.assert(sampleLog);
  }

  // Step 5: Test additional filtering with severity level
  const severityFilterRequest = {
    event_type: "rate_limit_exceeded",
    severity: "high" as const,
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const filteredLogs: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: severityFilterRequest,
      },
    );
  typia.assert(filteredLogs);

  TestValidator.equals(
    "filtered logs pagination limit matches request",
    filteredLogs.pagination.limit,
    25,
  );
}
