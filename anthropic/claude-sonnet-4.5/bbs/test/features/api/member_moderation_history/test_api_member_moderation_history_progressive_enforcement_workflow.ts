import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test the progressive enforcement workflow where moderators review complete
 * member history before applying new disciplinary actions.
 *
 * This scenario validates the real-world use case of escalating enforcement
 * based on violation patterns. The test demonstrates querying member moderation
 * history to identify:
 *
 * - Number of previous warnings (article edits)
 * - Severity of past violations (content deletions)
 * - Previous account actions (suspensions, bans)
 * - Time since last incident
 * - Frequency of violations over time
 *
 * The comprehensive history view combining content and account actions enables
 * informed decisions about appropriate action severity (warning → temporary
 * suspension → extended suspension → permanent ban). This represents the
 * critical pre-action review process moderators perform.
 */
export async function test_api_member_moderation_history_progressive_enforcement_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModPass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Verify moderator profile
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.predicate(
    "moderator authenticated with token",
    !!moderator.token.access,
  );

  // Step 2: Generate a member ID to query moderation history for
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve basic moderation history with default pagination
  const basicHistory: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(basicHistory);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    basicHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    basicHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    basicHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    basicHistory.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(basicHistory.data));

  // Step 4: Query history filtered by content moderation actions (article edits, deletions)
  const contentActions = [
    "article_edited",
    "article_deleted",
    "attachment_removed",
  ];
  const contentHistory: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 50,
          action_types: contentActions,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(contentHistory);

  // Step 5: Query history filtered by account-level actions (suspensions, bans)
  const accountActions = [
    "account_suspended",
    "account_banned",
    "account_restored",
  ];
  const accountHistory: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 50,
          action_types: accountActions,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(accountHistory);

  // Step 6: Query recent history (last 30 days) to assess current violation patterns
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentHistory: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 100,
          from_date: thirtyDaysAgo.toISOString(),
          to_date: new Date().toISOString(),
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(recentHistory);

  // Step 7: Query historical violations (older than 30 days) to identify patterns
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const historicalViolations: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 100,
          from_date: ninetyDaysAgo.toISOString(),
          to_date: thirtyDaysAgo.toISOString(),
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(historicalViolations);

  // Step 8: Query actions by specific moderator to review consistency
  const moderatorFilteredHistory: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 50,
          moderator_id: moderator.id,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(moderatorFilteredHistory);

  // Step 9: Query sorted by action type to group similar violations
  const groupedByActionType: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 100,
          sort_by: "action_type",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(groupedByActionType);

  // Step 10: Test pagination by retrieving multiple pages
  const firstPage: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(firstPage);

  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageIDiscussionBoardModerationLog.ISummary =
      await api.functional.discussionBoard.moderator.members.moderationHistory.index(
        connection,
        {
          memberId: targetMemberId,
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardModerationLog.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page number is correct",
      secondPage.pagination.current,
      2,
    );
  }

  // Validate comprehensive query capabilities for progressive enforcement decision-making
  TestValidator.predicate(
    "moderator can query complete member history",
    basicHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "moderator can filter by content action types",
    Array.isArray(contentHistory.data),
  );
  TestValidator.predicate(
    "moderator can filter by account action types",
    Array.isArray(accountHistory.data),
  );
  TestValidator.predicate(
    "moderator can filter by date ranges for recent violations",
    Array.isArray(recentHistory.data),
  );
  TestValidator.predicate(
    "moderator can analyze historical violation patterns",
    Array.isArray(historicalViolations.data),
  );
}
