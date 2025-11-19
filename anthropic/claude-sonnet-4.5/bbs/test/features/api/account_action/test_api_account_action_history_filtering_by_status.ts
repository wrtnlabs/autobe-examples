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
 * Test filtering member enforcement history by current status to identify
 * active, expired, or reversed actions.
 *
 * This test validates the status-based filtering functionality for account
 * enforcement actions. It creates a moderator account, generates multiple
 * account actions with different statuses, and verifies that the filtering API
 * correctly returns only actions matching the specified status.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create multiple account actions (suspensions and bans) against a member
 * 3. Query account actions with status filter set to 'active'
 * 4. Validate that only active enforcement actions are returned
 * 5. Verify pagination and response structure integrity
 */
export async function test_api_account_action_history_filtering_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
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

  // Step 2: Generate member ID for enforcement actions
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create multiple account actions with different types
  const activeSuspensionData = {
    discussion_board_member_id: targetMemberId,
    action_type: "suspension" as const,
    reason:
      "Repeated spam violations after multiple warnings. User posted promotional content in 5 different threads despite warnings.",
    duration_days: 7 as const,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const activeSuspension: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      { body: activeSuspensionData },
    );
  typia.assert(activeSuspension);

  const activeBanData = {
    discussion_board_member_id: targetMemberId,
    action_type: "ban" as const,
    reason:
      "Severe policy violation - posting illegal content and harassing other members repeatedly.",
    duration_days: null,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const activeBan: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      { body: activeBanData },
    );
  typia.assert(activeBan);

  const anotherSuspensionData = {
    discussion_board_member_id: targetMemberId,
    action_type: "suspension" as const,
    reason:
      "Inappropriate language and personal attacks in discussion threads.",
    duration_days: 14 as const,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const anotherSuspension: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      { body: anotherSuspensionData },
    );
  typia.assert(anotherSuspension);

  // Step 4: Query account actions with status filter for 'active' status
  const filterRequest = {
    page: 1,
    limit: 20,
    status: "active" as const,
  } satisfies IDiscussionBoardAccountAction.IRequest;

  const filteredResults: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: targetMemberId,
        body: filterRequest,
      },
    );
  typia.assert(filteredResults);

  // Step 5: Validate filtering results
  TestValidator.predicate(
    "filtered results should contain data",
    filteredResults.data.length > 0,
  );

  TestValidator.predicate(
    "all returned actions should have active status",
    filteredResults.data.every((action) => action.status === "active"),
  );

  TestValidator.predicate(
    "should have created at least 3 active actions",
    filteredResults.data.length >= 3,
  );

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    filteredResults.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 20",
    filteredResults.pagination.limit === 20,
  );

  // Verify that created actions are present in filtered results
  const resultIds = filteredResults.data.map((action) => action.id);
  TestValidator.predicate(
    "active suspension should be in filtered results",
    resultIds.includes(activeSuspension.id),
  );

  TestValidator.predicate(
    "active ban should be in filtered results",
    resultIds.includes(activeBan.id),
  );

  TestValidator.predicate(
    "another suspension should be in filtered results",
    resultIds.includes(anotherSuspension.id),
  );
}
