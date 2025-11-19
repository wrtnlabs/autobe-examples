import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

/**
 * Test filtering account restrictions by status (active, lifted, expired).
 *
 * This test validates that the restriction search API correctly filters
 * restrictions by their enforcement status. The test creates a moderator
 * account, then searches for restrictions filtering by each status value
 * independently (active, lifted, expired).
 *
 * The test verifies:
 *
 * - Active restrictions return only restrictions with status "active" (no
 *   lifted_at, no lift_reason)
 * - Lifted restrictions return only restrictions with status "lifted" (contains
 *   lifted_at, identifies lifting moderator)
 * - Expired restrictions return only restrictions with status "expired" (natural
 *   expiration without manual lifting)
 *
 * Steps:
 *
 * 1. Register a moderator account for authentication
 * 2. Search for restrictions filtered by "active" status
 * 3. Validate that returned restrictions have status "active" and no lifted_at
 *    timestamp
 * 4. Search for restrictions filtered by "lifted" status
 * 5. Validate that returned restrictions have status "lifted" with lifted_at
 *    timestamp
 * 6. Search for restrictions filtered by "expired" status
 * 7. Validate that returned restrictions have status "expired" without manual
 *    lifting
 */
export async function test_api_moderation_restrictions_filter_by_status(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search for restrictions filtered by "active" status
  const activeRestrictions: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          status: "active",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(activeRestrictions);

  // Step 3: Validate that returned restrictions have status "active" and no lifted_at timestamp
  TestValidator.predicate(
    "all active restrictions should have status active",
    () => activeRestrictions.data.every((r) => r.status === "active"),
  );
  TestValidator.predicate(
    "all active restrictions should not have lifted_at timestamp",
    () => activeRestrictions.data.every((r) => r.lifted_at === null),
  );
  TestValidator.predicate(
    "all active restrictions should not have lifted_by_moderator",
    () => activeRestrictions.data.every((r) => r.lifted_by_moderator === null),
  );

  // Step 4: Search for restrictions filtered by "lifted" status
  const liftedRestrictions: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          status: "lifted",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(liftedRestrictions);

  // Step 5: Validate that returned restrictions have status "lifted" with lifted_at timestamp
  TestValidator.predicate(
    "all lifted restrictions should have status lifted",
    () => liftedRestrictions.data.every((r) => r.status === "lifted"),
  );
  TestValidator.predicate(
    "all lifted restrictions should have lifted_at timestamp",
    () =>
      liftedRestrictions.data.every(
        (r) => r.lifted_at !== null && r.lifted_at !== undefined,
      ),
  );
  TestValidator.predicate(
    "all lifted restrictions should have lifted_by_moderator",
    () =>
      liftedRestrictions.data.every(
        (r) =>
          r.lifted_by_moderator !== null && r.lifted_by_moderator !== undefined,
      ),
  );

  // Step 6: Search for restrictions filtered by "expired" status
  const expiredRestrictions: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          status: "expired",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(expiredRestrictions);

  // Step 7: Validate that returned restrictions have status "expired" without manual lifting
  TestValidator.predicate(
    "all expired restrictions should have status expired",
    () => expiredRestrictions.data.every((r) => r.status === "expired"),
  );
  TestValidator.predicate(
    "all expired restrictions should not have lifted_at timestamp",
    () => expiredRestrictions.data.every((r) => r.lifted_at === null),
  );
  TestValidator.predicate(
    "all expired restrictions should not have lifted_by_moderator",
    () => expiredRestrictions.data.every((r) => r.lifted_by_moderator === null),
  );
}
