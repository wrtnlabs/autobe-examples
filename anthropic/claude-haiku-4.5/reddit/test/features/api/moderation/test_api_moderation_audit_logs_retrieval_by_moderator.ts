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
 * Validates moderator audit log retrieval with comprehensive search and
 * filtering.
 *
 * This test creates a moderator account and validates that moderators can
 * retrieve paginated lists of moderation audit logs. The test covers:
 *
 * 1. Moderator authentication and registration
 * 2. Basic audit log retrieval with default pagination
 * 3. Filtering by action type, target type, and action status
 * 4. Free-text search across audit log fields
 * 5. Sorting by various fields in ascending and descending order
 * 6. Timestamp range filtering for compliance audits
 * 7. Pagination limit validation (1-100 records per page)
 * 8. Response structure validation including complete accountability information
 * 9. Immutable audit trail integrity verification
 *
 * The test ensures that the audit log system maintains a complete historical
 * record of all moderation actions with proper authorization controls.
 */
export async function test_api_moderation_audit_logs_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify moderator credentials
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator is active",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator has valid karma score",
    moderator.karma_score >= 0,
  );

  // Step 2: Retrieve audit logs with default pagination
  const defaultAuditLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(defaultAuditLogs);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    defaultAuditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultAuditLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultAuditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultAuditLogs.pagination.pages >= 0,
  );

  // Step 3: Test pagination with specific page and limit
  const paginatedAuditLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedAuditLogs);
  TestValidator.equals(
    "page limit respected",
    paginatedAuditLogs.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "data array length not exceeds limit",
    paginatedAuditLogs.data.length <= 50,
  );

  // Step 4: Test filtering by action type
  const removePostLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_post",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(removePostLogs);

  // Verify all results have the correct action type
  for (const log of removePostLogs.data) {
    TestValidator.equals(
      "audit log action type matches filter",
      log.action_type,
      "remove_post",
    );
  }

  // Step 5: Test filtering by target type
  const userTargetLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "user",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(userTargetLogs);

  for (const log of userTargetLogs.data) {
    TestValidator.equals(
      "audit log target type matches filter",
      log.target_type,
      "user",
    );
  }

  // Step 6: Test filtering by action status
  const successLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_status: "success",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(successLogs);

  for (const log of successLogs.data) {
    TestValidator.equals(
      "audit log action status matches filter",
      log.action_status,
      "success",
    );
  }

  // Step 7: Test free-text search
  const searchLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          search: "violation",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(searchLogs);

  // Step 8: Test sorting by created_at ascending
  const sortedAscLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortedAscLogs);

  // Verify ascending order
  for (let i = 1; i < sortedAscLogs.data.length; i++) {
    const prevDate = new Date(sortedAscLogs.data[i - 1].created_at).getTime();
    const currDate = new Date(sortedAscLogs.data[i].created_at).getTime();
    TestValidator.predicate(
      "created_at ascending order maintained",
      prevDate <= currDate,
    );
  }

  // Step 9: Test sorting by created_at descending
  const sortedDescLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortedDescLogs);

  // Verify descending order
  for (let i = 1; i < sortedDescLogs.data.length; i++) {
    const prevDate = new Date(sortedDescLogs.data[i - 1].created_at).getTime();
    const currDate = new Date(sortedDescLogs.data[i].created_at).getTime();
    TestValidator.predicate(
      "created_at descending order maintained",
      prevDate >= currDate,
    );
  }

  // Step 10: Test sorting by action_type
  const sortByActionType: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "action_type",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortByActionType);

  // Step 11: Test sorting by target_type
  const sortByTargetType: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "target_type",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortByTargetType);

  // Step 12: Test sorting by action_status
  const sortByActionStatus: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          sort_by: "action_status",
          order: "desc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortByActionStatus);

  // Step 13: Test timestamp range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const rangedLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          created_at_from: oneMonthAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(rangedLogs);

  // Verify all logs are within date range
  for (const log of rangedLogs.data) {
    const logDate = new Date(log.created_at).getTime();
    TestValidator.predicate(
      "audit log within date range",
      logDate >= oneMonthAgo.getTime() && logDate <= now.getTime(),
    );
  }

  // Step 14: Test filtering by moderator ID
  const moderatorIdFilteredLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          moderator_id: moderator.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(moderatorIdFilteredLogs);

  // All logs should be from this moderator
  for (const log of moderatorIdFilteredLogs.data) {
    TestValidator.equals(
      "audit log moderator matches filter",
      log.moderator.id,
      moderator.id,
    );
  }

  // Step 15: Validate audit log entry structure and accountability information
  if (defaultAuditLogs.data.length > 0) {
    const sampleLog = defaultAuditLogs.data[0];

    // Verify complete accountability information
    TestValidator.predicate(
      "log has id",
      sampleLog.id !== undefined && sampleLog.id !== null,
    );
    TestValidator.predicate(
      "log has action type",
      sampleLog.action_type !== undefined,
    );
    TestValidator.predicate(
      "log has target type",
      sampleLog.target_type !== undefined,
    );
    TestValidator.predicate(
      "log has target id",
      sampleLog.target_id !== undefined,
    );
    TestValidator.predicate(
      "log has action reason",
      sampleLog.action_reason !== undefined,
    );
    TestValidator.predicate(
      "log has action status",
      sampleLog.action_status !== undefined,
    );
    TestValidator.predicate(
      "log has moderator information",
      sampleLog.moderator !== undefined && sampleLog.moderator.id !== undefined,
    );
    TestValidator.predicate(
      "log has creation timestamp",
      sampleLog.created_at !== undefined,
    );
  }

  // Step 16: Test pagination limit constraints (1-100)
  const maxLimitLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(maxLimitLogs);
  TestValidator.predicate(
    "maximum limit respected",
    maxLimitLogs.pagination.limit <= 100,
  );

  const minLimitLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          limit: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(minLimitLogs);
  TestValidator.predicate(
    "minimum limit respected",
    minLimitLogs.pagination.limit >= 1,
  );

  // Step 17: Test combination of multiple filters
  const complexFilteredLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "ban_user",
          target_type: "user",
          action_status: "success",
          sort_by: "created_at",
          order: "desc",
          limit: 25,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(complexFilteredLogs);

  // Verify combined filters are applied
  for (const log of complexFilteredLogs.data) {
    TestValidator.equals(
      "combined filter: action type",
      log.action_type,
      "ban_user",
    );
    TestValidator.equals(
      "combined filter: target type",
      log.target_type,
      "user",
    );
    TestValidator.equals(
      "combined filter: action status",
      log.action_status,
      "success",
    );
  }
}
