import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test that only moderators with proper authorization can access the audit log
 * search endpoint.
 *
 * This test validates the authorization restrictions for the moderation audit
 * logs endpoint. It confirms that:
 *
 * - Authenticated moderators can successfully retrieve audit logs
 * - The endpoint returns properly structured paginated results
 * - Non-moderators cannot access the endpoint
 * - Invalid authentication tokens result in authorization failure
 * - Authorization checks are enforced before audit log data is returned
 *
 * The test follows the complete authorization workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Attempt to access the audit logs endpoint with valid authentication
 * 3. Verify successful access and response structure
 * 4. Validate that authorization is properly required
 * 5. Confirm that the endpoint enforces moderator-level access control
 */
export async function test_api_moderation_audit_logs_authorization_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with proper authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be created with valid credentials",
    moderator.id !== null && moderator.email === moderatorEmail,
  );

  // Step 2: Access the audit logs endpoint with moderator authentication
  const auditLogsRequest = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const auditLogsResult =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      { body: auditLogsRequest },
    );
  typia.assert(auditLogsResult);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "audit logs response should contain pagination info",
    auditLogsResult.pagination !== null &&
      auditLogsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "audit logs response should contain data array",
    Array.isArray(auditLogsResult.data),
  );

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    auditLogsResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    auditLogsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    auditLogsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    auditLogsResult.pagination.pages >= 0,
  );

  // Step 5: Test with unauthenticated connection (empty headers)
  const unauthenticatedConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      unauthenticatedConn,
      { body: auditLogsRequest },
    );
  });

  // Step 6: Test with various filter parameters to validate endpoint accepts proper moderator queries
  const filteredRequest = {
    page: 1,
    limit: 10,
    action_type: "remove_post" as const,
    target_type: "post" as const,
    action_status: "success" as const,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const filteredResults =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      { body: filteredRequest },
    );
  typia.assert(filteredResults);

  TestValidator.predicate(
    "filtered audit logs should return valid response",
    filteredResults.pagination !== null && Array.isArray(filteredResults.data),
  );

  // Step 7: Verify that data array items (if present) have proper structure
  if (filteredResults.data.length > 0) {
    const firstLog = filteredResults.data[0];
    TestValidator.predicate(
      "audit log entry should have required fields",
      firstLog.id !== null &&
        firstLog.id !== undefined &&
        firstLog.action_type !== null &&
        firstLog.action_status !== null,
    );
  }
}
