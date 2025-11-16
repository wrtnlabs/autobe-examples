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
 * Test filtering audit logs to show actions taken by a specific moderator.
 *
 * This scenario validates moderator-specific audit trail queries by
 * authenticating as an administrator and querying audit logs filtered by a
 * specific moderator_id. The test verifies that all returned audit log entries
 * match the specified moderator, validates pagination information, and ensures
 * accurate record counting for moderator-specific audit trails. This enables
 * accountability tracking and individual moderator performance analysis.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to access audit log filtering
 * 2. Query audit logs filtering by a specific moderator_id
 * 3. Verify all returned entries have matching moderator field
 * 4. Validate pagination structure and counts are correct
 * 5. Confirm filtered results reflect only the specified moderator's actions
 */
export async function test_api_moderation_audit_logs_filtering_by_moderator_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(8);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: adminUsername,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Query audit logs with moderator_id filter
  // Using the admin's ID as a moderator_id to filter the results
  const auditLogResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          moderator_id: admin.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Verify pagination structure exists
  TestValidator.predicate(
    "pagination object exists",
    auditLogResponse.pagination !== null &&
      auditLogResponse.pagination !== undefined,
  );

  // Step 4: Validate pagination properties
  const pagination = auditLogResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);

  // Step 5: Verify data array exists
  TestValidator.predicate(
    "audit log data array exists",
    Array.isArray(auditLogResponse.data),
  );

  // Step 6: Validate each returned audit log entry matches the moderator_id filter
  for (const auditLog of auditLogResponse.data) {
    typia.assert(auditLog);
    TestValidator.predicate(
      "audit log has matching moderator_id",
      auditLog.moderator.id === admin.id,
    );
    TestValidator.predicate(
      "audit log has valid action_type",
      [
        "remove_post",
        "remove_comment",
        "issue_warning",
        "suspend_user",
        "ban_user",
        "approve_report",
        "deny_report",
        "overturn_decision",
        "reduce_punishment",
      ].includes(auditLog.action_type),
    );
    TestValidator.predicate(
      "audit log has valid target_type",
      ["post", "comment", "user"].includes(auditLog.target_type),
    );
    TestValidator.predicate(
      "audit log has valid action_status",
      ["success", "failed", "partial"].includes(auditLog.action_status),
    );
  }

  // Step 7: Verify pagination records count matches or exceeds actual data length
  TestValidator.predicate(
    "pagination records >= returned data items",
    pagination.records >= auditLogResponse.data.length,
  );

  // Step 8: Query with pagination to test page 1 has correct offset
  const secondPageResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
          moderator_id: admin.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(secondPageResponse);

  TestValidator.predicate(
    "second page current value is 2",
    secondPageResponse.pagination.current === 2,
  );

  // Step 9: Test without moderator_id filter still works
  const unfiltered: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(unfiltered);

  TestValidator.predicate(
    "unfiltered results include all audit logs",
    unfiltered.pagination.records >= auditLogResponse.pagination.records,
  );
}
