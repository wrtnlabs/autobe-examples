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
 * Test filtering moderation audit logs by date range.
 *
 * Validates that the moderation audit logs API correctly filters records based
 * on created_at_from and created_at_to timestamp parameters. This is essential
 * for compliance audits and incident investigation where administrators need to
 * review moderation actions within specific time windows.
 *
 * Workflow:
 *
 * 1. Administrator signs up and authenticates
 * 2. Query audit logs with no date filters to establish baseline
 * 3. Query audit logs with a specific date range (from and to timestamps)
 * 4. Verify all returned logs fall within the specified range
 * 5. Validate pagination and data integrity of filtered results
 * 6. Test edge cases with only from date or only to date parameters
 */
export async function test_api_moderation_audit_logs_filtering_by_date_range(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/join",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator authenticated successfully",
    administrator.id !== null && administrator.id !== undefined,
  );

  // 2. Query audit logs without date filters to establish baseline
  const baselineQuery =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(baselineQuery);
  TestValidator.predicate(
    "baseline audit logs retrieved successfully",
    baselineQuery.data !== undefined && baselineQuery.pagination !== undefined,
  );

  // 3. Define date range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const createdAtFrom = thirtyDaysAgo.toISOString();
  const createdAtTo = fifteenDaysAgo.toISOString();

  // 4. Query audit logs with date range filter
  const filteredQuery =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: createdAtFrom,
          created_at_to: createdAtTo,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(filteredQuery);
  TestValidator.predicate(
    "filtered audit logs retrieved successfully",
    filteredQuery.data !== undefined && Array.isArray(filteredQuery.data),
  );

  // 5. Validate all returned logs have required summary fields
  if (filteredQuery.data.length > 0) {
    filteredQuery.data.forEach((log) => {
      TestValidator.predicate(
        "audit log entry has required fields",
        log.id !== undefined &&
          log.action_type !== undefined &&
          log.target_type !== undefined &&
          log.action_status !== undefined &&
          log.created_at !== undefined,
      );
    });
  }

  // 6. Validate all returned logs are within the specified date range
  TestValidator.predicate(
    "all audit logs are within date range",
    filteredQuery.data.every((log) => {
      const logCreatedAt = new Date(log.created_at);
      const fromDate = new Date(createdAtFrom);
      const toDate = new Date(createdAtTo);
      return logCreatedAt >= fromDate && logCreatedAt <= toDate;
    }),
  );

  // 7. Verify pagination information is present and valid
  TestValidator.predicate(
    "pagination information is valid",
    filteredQuery.pagination.current >= 0 &&
      filteredQuery.pagination.limit >= 0 &&
      filteredQuery.pagination.records >= 0 &&
      filteredQuery.pagination.pages >= 0,
  );

  // 8. Query with reversed date range (to before from) - should still work
  const reversedQuery =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: createdAtTo,
          created_at_to: createdAtFrom,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(reversedQuery);
  TestValidator.predicate(
    "reversed date range query handled properly",
    reversedQuery.pagination !== undefined,
  );

  // 9. Test with only from date (no to date)
  const fromOnlyQuery =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: createdAtFrom,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(fromOnlyQuery);
  TestValidator.predicate(
    "query with only from date works correctly",
    fromOnlyQuery.data !== undefined,
  );

  // 10. Test with only to date (no from date)
  const toOnlyQuery =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_to: createdAtTo,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(toOnlyQuery);
  TestValidator.predicate(
    "query with only to date works correctly",
    toOnlyQuery.data !== undefined,
  );
}
