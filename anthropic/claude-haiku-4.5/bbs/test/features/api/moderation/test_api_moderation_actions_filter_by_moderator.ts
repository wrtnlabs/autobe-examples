import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test filtering moderation actions by the moderator who performed the action.
 *
 * This test validates that moderators can filter the audit trail of moderation
 * actions by the moderator ID who performed them. This is essential for
 * supervisory oversight, consistency review, and auditing individual moderator
 * decisions.
 *
 * Test steps:
 *
 * 1. Register and authenticate first moderator
 * 2. Register and authenticate second moderator
 * 3. Query moderation actions without filter to establish baseline
 * 4. Filter actions by first moderator's ID
 * 5. Verify all filtered results belong to first moderator
 * 6. Filter actions by second moderator's ID
 * 7. Verify all filtered results belong to second moderator
 * 8. Test pagination with moderator filter
 * 9. Validate that filtered results don't include other moderators
 */
export async function test_api_moderation_actions_filter_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate first moderator
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Username = RandomGenerator.alphabets(15);
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: moderator1Username,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);
  const moderator1Id = moderator1.id;

  // Step 2: Register and authenticate second moderator
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Username = RandomGenerator.alphabets(15);
  const moderator2Connection = { ...connection, headers: {} };
  const moderator2 = await api.functional.auth.moderator.join(
    moderator2Connection,
    {
      body: {
        email: moderator2Email,
        username: moderator2Username,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator2);
  const moderator2Id = moderator2.id;

  // Step 3: Query all moderation actions to establish baseline
  const allActionsResponse =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(allActionsResponse);

  // Step 4: Filter actions by first moderator's ID
  const moderator1ActionsResponse =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          moderatorId: moderator1Id,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(moderator1ActionsResponse);

  // Step 5: Verify all filtered results belong to first moderator
  TestValidator.predicate(
    "all actions filtered by moderator1 should belong to moderator1",
    moderator1ActionsResponse.data.every(
      (action) => action.moderatorId === moderator1Id,
    ),
  );

  // Step 6: Filter actions by second moderator's ID
  const moderator2ActionsResponse =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          moderatorId: moderator2Id,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(moderator2ActionsResponse);

  // Step 7: Verify all filtered results belong to second moderator
  TestValidator.predicate(
    "all actions filtered by moderator2 should belong to moderator2",
    moderator2ActionsResponse.data.every(
      (action) => action.moderatorId === moderator2Id,
    ),
  );

  // Step 8: Test pagination with moderator filter
  const paginatedModerator1Response =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderatorId: moderator1Id,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(paginatedModerator1Response);

  TestValidator.predicate(
    "paginated results should all match moderator1 filter",
    paginatedModerator1Response.data.every(
      (action) => action.moderatorId === moderator1Id,
    ),
  );

  TestValidator.predicate(
    "pagination should be properly set",
    paginatedModerator1Response.pagination.current >= 1 &&
      paginatedModerator1Response.pagination.limit > 0,
  );

  // Step 9: Validate that filtered results are distinct and don't mix moderators
  const allModeratorIds = new Set(
    allActionsResponse.data.map((action) => action.moderatorId),
  );

  TestValidator.predicate(
    "moderator1 filter should not include moderator2 actions",
    !moderator1ActionsResponse.data.some(
      (action) => action.moderatorId === moderator2Id,
    ),
  );

  TestValidator.predicate(
    "moderator2 filter should not include moderator1 actions",
    !moderator2ActionsResponse.data.some(
      (action) => action.moderatorId === moderator1Id,
    ),
  );

  // Step 10: Verify response structure matches expected pagination format
  TestValidator.equals(
    "response should contain pagination with proper structure",
    typeof paginatedModerator1Response.pagination.current,
    "number",
  );

  TestValidator.equals(
    "response should contain data array",
    Array.isArray(paginatedModerator1Response.data),
    true,
  );
}
