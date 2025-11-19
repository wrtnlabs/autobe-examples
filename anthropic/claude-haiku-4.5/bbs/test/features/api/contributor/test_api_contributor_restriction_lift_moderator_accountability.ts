import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator accountability tracking for lift actions.
 *
 * This test validates that when a moderator lifts a restriction imposed by
 * another moderator, the system correctly tracks:
 *
 * 1. The original moderator who imposed the restriction
 * 2. The moderator who lifted the restriction (different moderator)
 * 3. Complete audit trail showing both enforcement and lift actions
 * 4. Proper attribution of moderation decisions
 *
 * Workflow:
 *
 * 1. Create first moderator account (imposing moderator)
 * 2. Create second moderator account (lifting moderator)
 * 3. Create contributor account
 * 4. First moderator imposes posting restriction on contributor
 * 5. Second moderator lifts the restriction early
 * 6. Verify lifted_by_moderator is the second moderator (different from
 *    imposed_by_moderator)
 * 7. Confirm complete audit trail with both actions
 */
export async function test_api_contributor_restriction_lift_moderator_accountability(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account (who will impose the restriction)
  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  // Store moderator 1's token for later use
  const moderator1Token = moderator1.token.access;

  // Step 2: Create second moderator account (who will lift the restriction)
  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword456!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 3: Create contributor account to be restricted
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ContributorPass123!",
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 4: Switch to first moderator and impose restriction
  const moderator1Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderator1Token}`,
    },
  };

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      moderator1Connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "posting_restriction",
          reason: "Violation of community guidelines - inappropriate content",
          expires_at: futureDate.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);

  // Verify the restriction was imposed by first moderator
  TestValidator.equals(
    "restriction imposed by first moderator",
    restriction.imposed_by_moderator.id,
    moderator1.id,
  );
  TestValidator.equals(
    "restriction status is active",
    restriction.status,
    "active",
  );
  TestValidator.predicate(
    "lifted_by_moderator is null before lifting",
    restriction.lifted_by_moderator === null,
  );

  // Step 5: Switch to second moderator and lift the restriction
  const moderator2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderator2.token.access}`,
    },
  };

  const liftedRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
      moderator2Connection,
      {
        contributorId: contributor.id,
        body: {
          lifted_reason:
            "Contributor demonstrated rehabilitation and removed offending content",
        } satisfies IDiscussionBoardAccountRestriction.IUpdate,
      },
    );
  typia.assert(liftedRestriction);

  // Step 6: Verify lifted_by_moderator is the second moderator (different from imposed_by_moderator)
  TestValidator.notEquals(
    "imposing moderator differs from lifting moderator",
    restriction.imposed_by_moderator.id,
    liftedRestriction.lifted_by_moderator?.id,
  );

  TestValidator.equals(
    "restriction lifted by second moderator",
    liftedRestriction.lifted_by_moderator?.id,
    moderator2.id,
  );

  // Step 7: Verify complete audit trail
  TestValidator.equals(
    "imposed_by_moderator preserved in audit trail",
    liftedRestriction.imposed_by_moderator.id,
    moderator1.id,
  );

  TestValidator.equals(
    "restriction status changed to lifted",
    liftedRestriction.status,
    "lifted",
  );

  TestValidator.predicate(
    "lifted_at timestamp is set",
    liftedRestriction.lifted_at !== null,
  );

  TestValidator.predicate(
    "moderator accountability is clear - different IDs",
    liftedRestriction.imposed_by_moderator.id !==
      liftedRestriction.lifted_by_moderator?.id,
  );
}
