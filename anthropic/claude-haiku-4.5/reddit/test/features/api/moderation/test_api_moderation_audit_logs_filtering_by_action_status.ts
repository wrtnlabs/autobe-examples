import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test filtering audit logs by action completion status.
 *
 * This test validates the filtering capability of the moderation audit logs
 * endpoint by action_status. It ensures that administrators can retrieve audit
 * logs filtered by success, failed, or partial status to identify problematic
 * moderation operations that may need investigation or remediation.
 *
 * Test workflow:
 *
 * 1. Authenticate as platform administrator with join credentials
 * 2. Query audit logs with filter for 'success' status
 * 3. Verify all returned logs have action_status = 'success'
 * 4. Query audit logs with filter for 'failed' status
 * 5. Verify all returned logs have action_status = 'failed'
 * 6. Query audit logs with filter for 'partial' status
 * 7. Verify all returned logs have action_status = 'partial'
 * 8. Validate pagination information is correct
 * 9. Verify each log contains required fields (id, action_type, target_type,
 *    moderator)
 */
export async function test_api_moderation_audit_logs_filtering_by_action_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Query audit logs filtered by 'success' status
  const successLogs =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_status: "success",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(successLogs);
  TestValidator.equals(
    "success logs pagination exists",
    typeof successLogs.pagination,
    "object",
  );
  typia.assert(successLogs.pagination);

  // Verify all success logs have correct status
  for (const log of successLogs.data) {
    TestValidator.equals(
      "log has success status",
      log.action_status,
      "success",
    );
    TestValidator.predicate(
      "log has required fields",
      () =>
        log.id !== undefined &&
        log.action_type !== undefined &&
        log.target_type !== undefined &&
        log.moderator !== undefined,
    );
  }

  // Step 3: Query audit logs filtered by 'failed' status
  const failedLogs =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_status: "failed",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(failedLogs);

  // Verify all failed logs have correct status
  for (const log of failedLogs.data) {
    TestValidator.equals("log has failed status", log.action_status, "failed");
  }

  // Step 4: Query audit logs filtered by 'partial' status
  const partialLogs =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_status: "partial",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(partialLogs);

  // Verify all partial logs have correct status
  for (const log of partialLogs.data) {
    TestValidator.equals(
      "log has partial status",
      log.action_status,
      "partial",
    );
  }

  // Step 5: Validate pagination consistency
  TestValidator.predicate(
    "pagination current is non-negative",
    () => successLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => successLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => successLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => successLogs.pagination.pages >= 0,
  );

  // Step 6: Query with explicit limit
  const limitedLogs =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          action_status: "success",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(limitedLogs);
  TestValidator.predicate(
    "limited query respects limit",
    () => limitedLogs.data.length <= 5,
  );

  // Step 7: Query with pagination offset
  const page2Logs =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          action_status: "failed",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(page2Logs);
  TestValidator.equals(
    "page 2 current matches request",
    page2Logs.pagination.current,
    2,
  );
}
