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
 * Test filtering moderation actions by affected member (affectedMemberId
 * filter).
 *
 * This test validates the moderator's ability to filter the moderation actions
 * audit trail by the affected member. When a moderator queries moderation
 * actions with an affectedMemberId filter, the system should return only those
 * actions that impacted the specified member's content or account.
 *
 * The test workflow:
 *
 * 1. Moderator authenticates to establish the moderation context
 * 2. Request moderation actions with specific affectedMemberId filters
 * 3. Validate that all returned actions have the correct affected member ID
 * 4. Verify pagination works correctly with the affectedMemberId filter
 * 5. Test with non-existent member ID to ensure proper empty result handling
 *
 * This functionality is critical for dispute resolution workflows where
 * moderators need complete visibility into all moderation actions affecting a
 * specific member.
 */
export async function test_api_moderation_actions_filter_by_affected_member(
  connection: api.IConnection,
) {
  // Step 1: Moderator authenticates
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<100>
      >(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test affected member ID (simulating a member whose actions we want to filter)
  const affectedMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Request moderation actions with affectedMemberId filter
  const filteredActions =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          affectedMemberId: affectedMemberId,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(filteredActions);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be set",
    filteredActions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    filteredActions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    filteredActions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    filteredActions.pagination.pages >= 0,
  );

  // Step 5: Validate all returned actions have the correct affected member ID
  for (const action of filteredActions.data) {
    typia.assert(action);
    TestValidator.equals(
      "moderation action affected member ID should match filter",
      action.memberId,
      affectedMemberId,
    );
    TestValidator.predicate(
      "action should have valid moderator ID",
      typia.is<string & tags.Format<"uuid">>(action.moderatorId),
    );
    TestValidator.predicate(
      "action should have valid content ID",
      typia.is<string & tags.Format<"uuid">>(action.content_id),
    );
    TestValidator.predicate(
      "action type should be valid",
      [
        "approved",
        "rejected",
        "requested_changes",
        "deleted_article",
        "deleted_comment",
        "edited_article",
        "edited_comment",
        "flagged",
      ].includes(action.action_type),
    );
    TestValidator.predicate(
      "content type should be article or comment",
      ["article", "comment"].includes(action.content_type),
    );
    TestValidator.predicate(
      "reason should have valid length",
      action.reason.length >= 10 && action.reason.length <= 500,
    );
  }

  // Step 6: Test with non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          affectedMemberId: nonExistentMemberId,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "non-existent member filter should return valid pagination",
    emptyResults.pagination.records >= 0,
  );

  // Step 7: Request without affectedMemberId filter (should return all actions)
  const allActions =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(allActions);
  TestValidator.predicate(
    "unfiltered query should return valid results",
    allActions.pagination.records >= 0,
  );

  // Step 8: Test pagination with affectedMemberId filter
  const paginatedResults =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          affectedMemberId: affectedMemberId,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResults.data.length <= 5,
  );
  for (const action of paginatedResults.data) {
    TestValidator.equals(
      "paginated result should maintain affected member filter",
      action.memberId,
      affectedMemberId,
    );
  }
}
