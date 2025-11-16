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
 * Test filtering moderation audit logs by specific moderator identity.
 *
 * Validates the ability to filter audit logs by moderator_id parameter and
 * retrieve all actions performed by a specific moderator. Tests that the
 * filtering returns complete accountability trail with action types, reasons,
 * timestamps, and outcomes. Verifies moderator conduct pattern tracking and
 * time-range specific activity analysis.
 *
 * Steps:
 *
 * 1. Create first moderator account for testing
 * 2. Create second moderator account for comparison
 * 3. Filter audit logs by first moderator's ID
 * 4. Verify all returned entries belong to the first moderator
 * 5. Validate audit log structure and moderator attribution
 * 6. Test time range filtering combined with moderator_id
 * 7. Confirm moderator accountability trail is complete and accurate
 */
export async function test_api_moderation_audit_logs_filter_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // 2. Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // 3. Filter audit logs by first moderator's ID
  const auditLogsPage =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          moderator_id: moderator1.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsPage);

  // 4. Verify pagination structure
  TestValidator.predicate(
    "pagination object exists",
    auditLogsPage.pagination !== null && auditLogsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    auditLogsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    auditLogsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(auditLogsPage.data),
  );

  // 5. Verify all returned entries belong to the first moderator
  if (auditLogsPage.data.length > 0) {
    for (const auditLog of auditLogsPage.data) {
      TestValidator.equals(
        "audit log belongs to queried moderator",
        auditLog.moderator.id,
        moderator1.id,
      );
      TestValidator.predicate(
        "audit log has action type",
        auditLog.action_type !== null && auditLog.action_type !== undefined,
      );
      TestValidator.predicate(
        "audit log has target type",
        auditLog.target_type !== null && auditLog.target_type !== undefined,
      );
      TestValidator.predicate(
        "audit log has action reason",
        auditLog.action_reason !== null &&
          auditLog.action_reason !== undefined &&
          auditLog.action_reason.length > 0,
      );
      TestValidator.predicate(
        "audit log has action status",
        auditLog.action_status !== null && auditLog.action_status !== undefined,
      );
      TestValidator.predicate(
        "audit log has created_at timestamp",
        auditLog.created_at !== null && auditLog.created_at !== undefined,
      );
    }
  }

  // 6. Test filtering with time range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const timeRangeLogsPage =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          moderator_id: moderator1.id,
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(timeRangeLogsPage);

  // 7. Verify time-range filtered results belong to moderator and are within time range
  if (timeRangeLogsPage.data.length > 0) {
    for (const auditLog of timeRangeLogsPage.data) {
      TestValidator.equals(
        "time-range filtered log belongs to moderator",
        auditLog.moderator.id,
        moderator1.id,
      );
      const logTime = new Date(auditLog.created_at);
      TestValidator.predicate(
        "log created after start time",
        logTime >= oneHourAgo,
      );
      TestValidator.predicate("log created before end time", logTime <= now);
    }
  }

  // 8. Test filtering by second moderator returns different results
  const moderator2LogsPage =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          moderator_id: moderator2.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(moderator2LogsPage);

  // Verify all logs belong to moderator2
  if (moderator2LogsPage.data.length > 0) {
    for (const auditLog of moderator2LogsPage.data) {
      TestValidator.equals(
        "second moderator logs belong to moderator2",
        auditLog.moderator.id,
        moderator2.id,
      );
    }
  }

  // 9. Test pagination with moderator_id filter
  const paginatedLogsPage1 =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: moderator1.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogsPage1);

  TestValidator.predicate(
    "page 1 returns consistent structure",
    paginatedLogsPage1.pagination !== null && paginatedLogsPage1.data !== null,
  );
}
