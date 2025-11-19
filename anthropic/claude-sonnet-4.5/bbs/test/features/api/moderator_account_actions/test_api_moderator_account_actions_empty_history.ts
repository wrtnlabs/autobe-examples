import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test retrieving account action history for a moderator with no enforcement
 * actions.
 *
 * This test validates the edge case of a newly created moderator who has never
 * performed any account-level moderation actions (suspensions or bans). The
 * test creates a fresh moderator account, authenticates, and immediately
 * queries their enforcement history without creating any actions.
 *
 * Expected behavior:
 *
 * 1. Create and authenticate a new moderator
 * 2. Query their account action history
 * 3. Receive empty data array with zero total records
 * 4. Pagination metadata shows 0 records and 0 pages
 *
 * This ensures the endpoint handles empty result sets gracefully for moderators
 * who focus on other moderation activities or are newly onboarded.
 */
export async function test_api_moderator_account_actions_empty_history(
  connection: api.IConnection,
) {
  // Create a new moderator account who has never performed any enforcement actions
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModPass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Verify moderator was created successfully
  TestValidator.predicate(
    "moderator email matches",
    moderator.email === moderatorData.email,
  );
  TestValidator.predicate(
    "moderator username matches",
    moderator.username === moderatorData.username,
  );

  // Query the account action history for this brand new moderator (should be empty)
  const emptyHistoryRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardAccountAction.IRequest;

  const accountActionsPage: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: emptyHistoryRequest,
      },
    );
  typia.assert(accountActionsPage);

  // Validate that the response is an empty result set with proper pagination
  TestValidator.equals(
    "data array should be empty",
    accountActionsPage.data,
    [],
  );
  TestValidator.equals(
    "total records should be zero",
    accountActionsPage.pagination.records satisfies number as number,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    accountActionsPage.pagination.pages satisfies number as number,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    accountActionsPage.pagination.current satisfies number as number,
    1,
  );
  TestValidator.equals(
    "page limit should match request",
    accountActionsPage.pagination.limit satisfies number as number,
    20,
  );
}
