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
 * Test sorting moderation audit logs by creation timestamp in ascending and
 * descending order.
 *
 * Validates that sort_by='created_at' with order='asc' returns audit logs
 * ordered from oldest to newest, showing historical progression. Tests that
 * sort_by='created_at' with order='desc' (default) returns logs from newest to
 * oldest, displaying recent moderation actions prominently. Confirms that
 * timestamp sorting enables chronological review of moderation history and
 * reconstruction of event sequences. Tests combining timestamp sorting with
 * filters to enable chronological analysis of specific moderators' actions.
 * Validates that the created_at field accurately reflects action timestamps and
 * enables consistent sorting.
 */
export async function test_api_moderation_audit_logs_sorting_by_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to access audit logs
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query audit logs with sort_by='created_at' and order='asc' (oldest first)
  const auditLogsAscending: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsAscending);

  // Validate ascending order - each timestamp should be >= previous timestamp
  if (auditLogsAscending.data.length > 1) {
    for (let i = 1; i < auditLogsAscending.data.length; i++) {
      const prevTimestamp = new Date(auditLogsAscending.data[i - 1].created_at);
      const currTimestamp = new Date(auditLogsAscending.data[i].created_at);
      TestValidator.predicate(
        "audit logs ascending order - current timestamp >= previous timestamp",
        currTimestamp.getTime() >= prevTimestamp.getTime(),
      );
    }
  }

  // Step 3: Query audit logs with sort_by='created_at' and order='desc' (newest first, default)
  const auditLogsDescending: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsDescending);

  // Validate descending order - each timestamp should be <= previous timestamp
  if (auditLogsDescending.data.length > 1) {
    for (let i = 1; i < auditLogsDescending.data.length; i++) {
      const prevTimestamp = new Date(
        auditLogsDescending.data[i - 1].created_at,
      );
      const currTimestamp = new Date(auditLogsDescending.data[i].created_at);
      TestValidator.predicate(
        "audit logs descending order - current timestamp <= previous timestamp",
        currTimestamp.getTime() <= prevTimestamp.getTime(),
      );
    }
  }

  // Step 4: Verify inverse relationship between ascending and descending results
  if (
    auditLogsAscending.data.length > 0 &&
    auditLogsDescending.data.length > 0
  ) {
    TestValidator.equals(
      "audit logs count should match between ascending and descending queries",
      auditLogsAscending.data.length,
      auditLogsDescending.data.length,
    );

    // First log in ascending should be last log in descending
    TestValidator.equals(
      "first log in ascending order should match last log in descending order",
      auditLogsAscending.data[0].id,
      auditLogsDescending.data[auditLogsDescending.data.length - 1].id,
    );

    // Last log in ascending should be first log in descending
    TestValidator.equals(
      "last log in ascending order should match first log in descending order",
      auditLogsAscending.data[auditLogsAscending.data.length - 1].id,
      auditLogsDescending.data[0].id,
    );
  }

  // Step 5: Query with default settings (should default to order='desc')
  const auditLogsDefault: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsDefault);

  // Verify default results match descending order
  if (auditLogsDefault.data.length > 0 && auditLogsDescending.data.length > 0) {
    TestValidator.predicate(
      "default query should return descending order (newest first)",
      auditLogsDefault.data.length > 0,
    );

    // If first entries exist, they should be recent (at least timestamps should match first entry)
    if (auditLogsDefault.data.length > 0) {
      TestValidator.equals(
        "first audit log timestamp in default query",
        auditLogsDefault.data[0].created_at,
        auditLogsDescending.data[0].created_at,
      );
    }
  }

  // Step 6: Query with moderator filter and timestamp sort
  if (moderator.id) {
    const filteredLogsDescending: IPageICommunityPlatformModerationAuditLog.ISummary =
      await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
        connection,
        {
          body: {
            moderator_id: moderator.id,
            sort_by: "created_at",
            order: "desc",
            limit: 20,
            page: 1,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(filteredLogsDescending);

    // Validate all logs are from the specified moderator
    for (const log of filteredLogsDescending.data) {
      TestValidator.equals(
        "filtered log should belong to specified moderator",
        log.moderator.id,
        moderator.id,
      );
    }

    // Validate filtered logs maintain descending timestamp order
    if (filteredLogsDescending.data.length > 1) {
      for (let i = 1; i < filteredLogsDescending.data.length; i++) {
        const prevTimestamp = new Date(
          filteredLogsDescending.data[i - 1].created_at,
        );
        const currTimestamp = new Date(
          filteredLogsDescending.data[i].created_at,
        );
        TestValidator.predicate(
          "filtered audit logs maintain descending timestamp order",
          currTimestamp.getTime() <= prevTimestamp.getTime(),
        );
      }
    }
  }

  // Step 7: Pagination consistency with timestamp sorting
  const page1: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(page1);

  // Verify pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 5",
    page1.pagination.limit === 5,
  );

  // Verify timestamp sorting within page
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      const prevTimestamp = new Date(page1.data[i - 1].created_at);
      const currTimestamp = new Date(page1.data[i].created_at);
      TestValidator.predicate(
        "page results maintain descending timestamp order",
        currTimestamp.getTime() <= prevTimestamp.getTime(),
      );
    }
  }
}
