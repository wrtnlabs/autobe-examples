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
 * Test filtering member enforcement history by action type to distinguish
 * between temporary suspensions and permanent bans.
 *
 * This test validates the search and filter capabilities for reviewing specific
 * types of enforcement actions. The test creates a moderator account, then
 * applies multiple actions of different types (both suspensions and bans) to a
 * member. The moderator then retrieves the member's history with action_type
 * filter set to 'suspension' to view only temporary suspensions, and separately
 * filters by 'ban' to view only permanent bans.
 *
 * Validation confirms that filtering by action_type correctly restricts results
 * to only the specified action type, that suspensions show proper duration and
 * expiration fields while bans have null duration/expiration, and that the
 * filter works correctly with pagination.
 */
export async function test_api_account_action_history_filtering_by_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authenticated access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a second moderator to act as a member for enforcement actions
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass456!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(member);

  const memberId = member.id;

  // Step 3: Restore moderator authentication by setting the token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = moderator.token.access;

  // Step 4: Create first suspension (1 day)
  const suspension1: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "suspension",
          reason: "First violation - spam posting detected",
          duration_days: 1,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspension1);

  // Step 5: Create second suspension (7 days)
  const suspension2: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "suspension",
          reason: "Second violation - harassment of other members",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspension2);

  // Step 6: Create first ban
  const ban1: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "ban",
          reason: "Severe policy violation - illegal content posting",
          duration_days: null,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(ban1);

  // Step 7: Create second ban
  const ban2: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "ban",
          reason: "Repeated severe violations after multiple suspensions",
          duration_days: null,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(ban2);

  // Step 8: Retrieve history filtered by suspension action type
  const suspensionHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: memberId,
        body: {
          action_type: "suspension",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(suspensionHistory);

  // Step 9: Validate suspension filtering results
  TestValidator.equals(
    "suspension history should have 2 items",
    suspensionHistory.data.length,
    2,
  );

  for (const action of suspensionHistory.data) {
    TestValidator.equals(
      "action type should be suspension",
      action.action_type,
      "suspension",
    );
    TestValidator.predicate(
      "suspension should have duration_days",
      action.duration_days !== null && action.duration_days !== undefined,
    );
    TestValidator.predicate(
      "suspension should have expires_at",
      action.expires_at !== null && action.expires_at !== undefined,
    );
  }

  // Step 10: Retrieve history filtered by ban action type
  const banHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: memberId,
        body: {
          action_type: "ban",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(banHistory);

  // Step 11: Validate ban filtering results
  TestValidator.equals(
    "ban history should have 2 items",
    banHistory.data.length,
    2,
  );

  for (const action of banHistory.data) {
    TestValidator.equals(
      "action type should be ban",
      action.action_type,
      "ban",
    );
    TestValidator.predicate(
      "ban should have null duration_days",
      action.duration_days === null || action.duration_days === undefined,
    );
    TestValidator.predicate(
      "ban should have null expires_at",
      action.expires_at === null || action.expires_at === undefined,
    );
  }

  // Step 12: Validate pagination structure
  TestValidator.predicate(
    "suspension pagination should be valid",
    suspensionHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "ban pagination should be valid",
    banHistory.pagination.current >= 1,
  );
}
