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
 * Test investigation of suspicious activity events through security logs.
 *
 * This test validates the administrator's ability to search and retrieve
 * security log entries specifically for suspicious activity events. The test
 * ensures that security monitoring and incident investigation capabilities are
 * functioning correctly by:
 *
 * 1. Creating and authenticating an administrator account
 * 2. Searching for suspicious_activity event types in security logs
 * 3. Validating the paginated response structure
 * 4. Verifying that suspicious activities have appropriate severity levels
 * 5. Confirming that detailed metadata is available for incident investigation
 *
 * This supports proactive security monitoring and early threat detection.
 */
export async function test_api_security_logs_suspicious_activity_investigation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for security log access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Search for suspicious activity events in security logs
  const searchRequest = {
    event_type: "suspicious_activity",
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const securityLogResults =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(securityLogResults);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should match request",
    securityLogResults.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    securityLogResults.pagination.limit === 50,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    securityLogResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    securityLogResults.pagination.pages >= 0,
  );

  // Step 4: Validate data array structure
  TestValidator.predicate(
    "security log data should be an array",
    Array.isArray(securityLogResults.data),
  );

  // Step 5: If suspicious activity events exist, validate their properties
  if (securityLogResults.data.length > 0) {
    const firstLog = securityLogResults.data[0];
    typia.assert(firstLog);

    // Validate event_type matches our search
    TestValidator.equals(
      "event type should be suspicious_activity",
      firstLog.event_type,
      "suspicious_activity",
    );

    // Validate severity level is appropriate for suspicious activities
    TestValidator.predicate(
      "suspicious activity should have high or critical severity",
      firstLog.severity === "high" || firstLog.severity === "critical",
    );

    // Validate IP address exists (required field)
    TestValidator.predicate(
      "security log should have non-empty IP address",
      firstLog.ip_address.length > 0,
    );

    // Validate description exists and is meaningful
    TestValidator.predicate(
      "security log should have non-empty description",
      firstLog.description.length > 0,
    );
  }
}
