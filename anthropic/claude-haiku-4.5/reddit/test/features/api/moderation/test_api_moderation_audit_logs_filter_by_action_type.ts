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
 * Test filtering moderation audit logs by specific action types.
 *
 * This test validates that the audit log filtering API correctly filters
 * moderation actions by their type (remove_post, remove_comment, issue_warning,
 * suspend_user, ban_user, approve_report, deny_report, overturn_decision,
 * reduce_punishment). It verifies that each action type filter returns only
 * logs matching that specific action, and tests combining multiple filter
 * criteria.
 *
 * Steps:
 *
 * 1. Create moderator account for authentication
 * 2. Filter audit logs by each action type individually
 * 3. Verify filtered results contain only matching action types
 * 4. Test combining action_type filter with other criteria
 * 5. Verify pagination works correctly with filtered results
 * 6. Test edge cases with empty result sets
 */
export async function test_api_moderation_audit_logs_filter_by_action_type(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphabets(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test filtering by remove_post action type
  const removePostLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_post",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(removePostLogs);

  // Verify all returned logs have remove_post action type
  for (const log of removePostLogs.data) {
    TestValidator.equals(
      "remove_post filter returns only remove_post actions",
      log.action_type,
      "remove_post",
    );
  }

  // 3. Test filtering by suspend_user action type
  const suspendUserLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "suspend_user",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(suspendUserLogs);

  // Verify all returned logs have suspend_user action type
  for (const log of suspendUserLogs.data) {
    TestValidator.equals(
      "suspend_user filter returns only suspend_user actions",
      log.action_type,
      "suspend_user",
    );
  }

  // 4. Test filtering by ban_user action type
  const banUserLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "ban_user",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(banUserLogs);

  for (const log of banUserLogs.data) {
    TestValidator.equals(
      "ban_user filter returns only ban_user actions",
      log.action_type,
      "ban_user",
    );
  }

  // 5. Test filtering by remove_comment action type
  const removeCommentLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_comment",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(removeCommentLogs);

  for (const log of removeCommentLogs.data) {
    TestValidator.equals(
      "remove_comment filter returns only remove_comment actions",
      log.action_type,
      "remove_comment",
    );
  }

  // 6. Test filtering by issue_warning action type
  const issueWarningLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "issue_warning",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(issueWarningLogs);

  for (const log of issueWarningLogs.data) {
    TestValidator.equals(
      "issue_warning filter returns only issue_warning actions",
      log.action_type,
      "issue_warning",
    );
  }

  // 7. Test filtering by approve_report action type
  const approveReportLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "approve_report",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(approveReportLogs);

  for (const log of approveReportLogs.data) {
    TestValidator.equals(
      "approve_report filter returns only approve_report actions",
      log.action_type,
      "approve_report",
    );
  }

  // 8. Test filtering by deny_report action type
  const denyReportLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "deny_report",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(denyReportLogs);

  for (const log of denyReportLogs.data) {
    TestValidator.equals(
      "deny_report filter returns only deny_report actions",
      log.action_type,
      "deny_report",
    );
  }

  // 9. Test filtering by overturn_decision action type
  const overturnDecisionLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "overturn_decision",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(overturnDecisionLogs);

  for (const log of overturnDecisionLogs.data) {
    TestValidator.equals(
      "overturn_decision filter returns only overturn_decision actions",
      log.action_type,
      "overturn_decision",
    );
  }

  // 10. Test filtering by reduce_punishment action type
  const reducePunishmentLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "reduce_punishment",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(reducePunishmentLogs);

  for (const log of reducePunishmentLogs.data) {
    TestValidator.equals(
      "reduce_punishment filter returns only reduce_punishment actions",
      log.action_type,
      "reduce_punishment",
    );
  }

  // 11. Test combining action_type with action_status filter
  const successfulRemovePostLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_post",
          action_status: "success",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(successfulRemovePostLogs);

  // Verify all logs match both filters
  for (const log of successfulRemovePostLogs.data) {
    TestValidator.equals(
      "combined filter: action_type is remove_post",
      log.action_type,
      "remove_post",
    );
    TestValidator.equals(
      "combined filter: action_status is success",
      log.action_status,
      "success",
    );
  }

  // 12. Test pagination with action_type filter
  const paginatedLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "suspend_user",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedLogs.data.length <= 10,
  );

  // Verify pagination info
  TestValidator.equals(
    "pagination current page is 1",
    paginatedLogs.pagination.current,
    1,
  );

  // 13. Test filtering with empty results (no logs of certain action type)
  const filteredLogsWithSearch =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "ban_user",
          search: RandomGenerator.alphabets(20),
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(filteredLogsWithSearch);

  // 14. Verify that filtering returns consistent results
  const firstFilteredCall =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_comment",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(firstFilteredCall);

  const secondFilteredCall =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          action_type: "remove_comment",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(secondFilteredCall);

  // Both calls should return the same number of records (if no new logs added)
  TestValidator.equals(
    "consistent filter results",
    firstFilteredCall.data.length,
    secondFilteredCall.data.length,
  );
}
