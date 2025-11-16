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
 * Test filtering moderation audit logs by specific action type.
 *
 * This test validates the filtering capability of the audit log endpoint. The
 * scenario covers the complete workflow:
 *
 * 1. Authenticate as administrator with valid credentials
 * 2. Query audit logs with filtering by specific action_type
 * 3. Verify response contains only entries matching the filter criteria
 * 4. Validate pagination information and result accuracy
 *
 * The test ensures the audit log system properly filters by action category for
 * focused compliance and investigation queries, enabling administrators to
 * efficiently review specific types of moderation actions.
 */
export async function test_api_moderation_audit_logs_filtering_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Query audit logs with action_type filter
  const actionType = "remove_post" as const;
  const auditLogResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_type: actionType,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Verify all returned entries match the filter criteria
  TestValidator.predicate(
    "all audit logs should have action_type matching filter",
    () => {
      return auditLogResponse.data.every(
        (log) => log.action_type === actionType,
      );
    },
  );

  // Step 4: Validate pagination information
  TestValidator.equals(
    "current page should be 1",
    auditLogResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should be 20",
    auditLogResponse.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "returned data count should not exceed limit",
    auditLogResponse.data.length <= auditLogResponse.pagination.limit,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    auditLogResponse.pagination.records >= 0,
  );

  // Step 5: Test with different action_type filters
  const altActionType = "ban_user" as const;
  const altAuditLogResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          action_type: altActionType,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(altAuditLogResponse);

  // Step 6: Verify alternative action_type filter works correctly
  TestValidator.predicate(
    "all logs with ban_user filter should match action_type",
    () => {
      return altAuditLogResponse.data.every(
        (log) => log.action_type === altActionType,
      );
    },
  );

  // Step 7: Test pagination with custom limit
  const customLimitResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          action_type: "suspend_user",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(customLimitResponse);

  TestValidator.equals(
    "custom limit should be respected",
    customLimitResponse.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "returned data should not exceed custom limit",
    customLimitResponse.data.length <= 5,
  );
}
