import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test filtering account actions by the moderator who applied them to review
 * specific moderator's enforcement activity.
 *
 * This test validates that the moderator_id filter enables auditing of
 * individual moderator decision patterns and enforcement consistency. Multiple
 * moderators authenticate, each creates enforcement actions, then search is
 * performed with moderator_id filter to retrieve only actions performed by a
 * specific moderator.
 *
 * Workflow:
 *
 * 1. Create first moderator account
 * 2. Create member target for first moderator's action
 * 3. First moderator creates enforcement action
 * 4. Create second moderator account
 * 5. Create member target for second moderator's action
 * 6. Second moderator creates enforcement action
 * 7. Search account actions filtering by first moderator's ID
 * 8. Validate only first moderator's actions are returned
 */
export async function test_api_account_action_filter_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 2: Create member for first moderator's action
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  // Step 3: First moderator creates enforcement action
  const action1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member1.id,
          action_type: "suspension",
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action1);

  // Step 4: Create second moderator
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 5: Create member for second moderator's action
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  // Step 6: Second moderator creates enforcement action
  const action2 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member2.id,
          action_type: "ban",
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action2);

  // Step 7: Search account actions filtering by first moderator's ID
  const filteredResults =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          moderator_id: moderator1.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(filteredResults);

  // Step 8: Validate results contain only first moderator's actions
  TestValidator.predicate(
    "search results should not be empty",
    filteredResults.data.length > 0,
  );

  TestValidator.predicate(
    "first moderator's action should be in filtered results",
    filteredResults.data.some((action) => action.id === action1.id),
  );

  TestValidator.predicate(
    "second moderator's action should not be in filtered results",
    !filteredResults.data.some((action) => action.id === action2.id),
  );
}
