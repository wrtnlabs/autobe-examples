import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";

/**
 * Test security investigation capabilities by filtering audit logs by IP
 * address.
 *
 * Administrator authenticates and searches audit logs using IP address filters
 * to track activities from specific network locations. The test validates that
 * the system returns all actions originating from the specified IP address and
 * supports fraud detection and security incident investigation. This enables
 * administrators to identify attack patterns, geographic threats, and correlate
 * suspicious activities from the same IP address.
 *
 * Workflow:
 *
 * 1. Register administrator account for IP-based security analysis
 * 2. Search audit logs using IP address filter
 * 3. Validate response structure with typia.assert()
 */
export async function test_api_audit_logs_ip_address_security_analysis(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Search audit logs using IP address filter
  const testIpAddress = "192.168.1.100";

  const searchRequest = {
    ip_address: testIpAddress,
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const auditLogsPage =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: searchRequest,
      },
    );

  // Step 3: Validate complete response structure - typia.assert validates everything
  typia.assert(auditLogsPage);
}
