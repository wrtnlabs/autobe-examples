import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

export async function test_api_moderation_audit_logs_sorting_by_moderator(
  connection: api.IConnection,
) {
  /** Create first moderator account for testing */
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  /** Create second moderator account for testing */
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  /** Retrieve audit logs sorted by moderator_id in ascending order */
  const auditLogsAsc =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "moderator_id",
          order: "asc",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsAsc);

  /**
   * Verify that results are sorted by moderator_id in ascending order Check
   * that moderator IDs are in non-decreasing order
   */
  if (auditLogsAsc.data.length > 1) {
    for (let i = 0; i < auditLogsAsc.data.length - 1; i++) {
      const currentModeratorId = auditLogsAsc.data[i].moderator.id;
      const nextModeratorId = auditLogsAsc.data[i + 1].moderator.id;

      TestValidator.predicate(
        "audit logs moderator IDs are in ascending order",
        currentModeratorId <= nextModeratorId,
      );
    }
  }

  /** Retrieve audit logs sorted by moderator_id in descending order */
  const auditLogsDesc =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "moderator_id",
          order: "desc",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsDesc);

  /** Verify that results are sorted by moderator_id in descending order */
  if (auditLogsDesc.data.length > 1) {
    for (let i = 0; i < auditLogsDesc.data.length - 1; i++) {
      const currentModeratorId = auditLogsDesc.data[i].moderator.id;
      const nextModeratorId = auditLogsDesc.data[i + 1].moderator.id;

      TestValidator.predicate(
        "audit logs moderator IDs are in descending order",
        currentModeratorId >= nextModeratorId,
      );
    }
  }

  /** Filter audit logs by specific moderator_id and verify grouping */
  const moderator1Logs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          moderator_id: moderator1.id,
          sort_by: "moderator_id",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(moderator1Logs);

  /** Verify all returned logs belong to the filtered moderator */
  for (const log of moderator1Logs.data) {
    TestValidator.equals(
      "all filtered logs belong to requested moderator",
      log.moderator.id,
      moderator1.id,
    );
  }

  /** Test pagination with moderator_id sorting */
  const auditLogsPage1 =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "moderator_id",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsPage1);

  /** Verify pagination information is correct */
  TestValidator.equals(
    "pagination current page is 1",
    auditLogsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    auditLogsPage1.pagination.limit,
    10,
  );

  /**
   * Combine moderator_id sorting with action_type filter to identify
   * enforcement patterns
   */
  const enforcementLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "moderator_id",
          action_type: "remove_post",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(enforcementLogs);

  /** Verify all returned logs are of the specified action type */
  for (const log of enforcementLogs.data) {
    TestValidator.equals(
      "all logs have matching action_type",
      log.action_type,
      "remove_post",
    );
  }
}
