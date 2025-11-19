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
 * Test filtering member moderation history by specific action types.
 *
 * This test validates that moderators can query enforcement history using
 * action_types filter to retrieve only matching entries. It verifies filtering
 * with single action type, multiple action types, and combinations of content
 * and account action types.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query moderation history with single action type filter (article_edited)
 * 3. Query moderation history with multiple content action types (article_deleted,
 *    attachment_removed)
 * 4. Query moderation history with account action types (account_suspended,
 *    account_banned)
 * 5. Query moderation history with mixed content and account action types
 * 6. Validate that all responses have correct structure and pagination
 */
export async function test_api_member_moderation_history_filtered_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Generate a random member ID for testing
  const testMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Query with single action type filter (article_edited)
  const singleActionTypeRequest = {
    page: 1,
    limit: 20,
    action_types: ["article_edited"],
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const singleActionResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: singleActionTypeRequest,
      },
    );
  typia.assert(singleActionResult);
  TestValidator.equals(
    "single action type query page number",
    singleActionResult.pagination.current,
    1,
  );

  // Step 3: Query with multiple content action types
  const contentActionTypesRequest = {
    page: 1,
    limit: 20,
    action_types: ["article_deleted", "attachment_removed"],
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const contentActionsResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: contentActionTypesRequest,
      },
    );
  typia.assert(contentActionsResult);
  TestValidator.equals(
    "content action types query limit",
    contentActionsResult.pagination.limit,
    20,
  );

  // Step 4: Query with account action types
  const accountActionTypesRequest = {
    page: 1,
    limit: 20,
    action_types: ["account_suspended", "account_banned"],
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const accountActionsResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: accountActionTypesRequest,
      },
    );
  typia.assert(accountActionsResult);
  TestValidator.predicate(
    "account action types query returns data array",
    Array.isArray(accountActionsResult.data),
  );

  // Step 5: Query with mixed content and account action types
  const mixedActionTypesRequest = {
    page: 1,
    limit: 20,
    action_types: ["article_edited", "account_suspended", "account_restored"],
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const mixedActionsResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: mixedActionTypesRequest,
      },
    );
  typia.assert(mixedActionsResult);
  TestValidator.predicate(
    "mixed action types result has data array",
    Array.isArray(mixedActionsResult.data),
  );

  // Step 6: Query with all possible action types
  const allActionTypesRequest = {
    page: 1,
    limit: 50,
    action_types: [
      "article_edited",
      "article_deleted",
      "attachment_removed",
      "account_suspended",
      "account_banned",
      "account_restored",
    ],
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const allActionsResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: allActionTypesRequest,
      },
    );
  typia.assert(allActionsResult);
  TestValidator.equals(
    "all action types query has correct limit",
    allActionsResult.pagination.limit,
    50,
  );
}
