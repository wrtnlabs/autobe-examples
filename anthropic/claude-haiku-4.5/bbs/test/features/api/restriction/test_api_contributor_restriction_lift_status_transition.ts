import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test proper status transition from 'active' to 'lifted' when restriction is
 * manually removed.
 *
 * This test validates the complete lifecycle of a contributor account
 * restriction:
 *
 * 1. Creates a moderator account to manage restrictions
 * 2. Creates a contributor account to apply restrictions to
 * 3. Applies a temporary restriction with 'active' status
 * 4. Lifts the restriction and validates:
 *
 *    - Status changes from 'active' to 'lifted'
 *    - Lifted_at timestamp is set
 *    - Lifted_by_moderator_id is populated with the lifting moderator
 *    - All other restriction fields remain unchanged
 *    - Distinguishes 'lifted' from 'expired' status
 */
export async function test_api_contributor_restriction_lift_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for restriction management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a contributor account to apply restrictions to
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "ContributorPass123!",
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Apply a temporary restriction with 'active' status
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "posting_restriction",
          reason: "Violation of community guidelines",
          expires_at: futureDate.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);

  // Validate initial restriction state is 'active'
  TestValidator.equals(
    "restriction status should be active",
    restriction.status,
    "active",
  );
  TestValidator.equals(
    "restriction type should be posting_restriction",
    restriction.restriction_type,
    "posting_restriction",
  );
  TestValidator.predicate(
    "restriction reason should be set",
    restriction.reason.length > 0,
  );
  TestValidator.equals(
    "imposed_by_moderator should match moderator",
    restriction.imposed_by_moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "lifted_by_moderator should be null for active restriction",
    restriction.lifted_by_moderator === null,
  );
  TestValidator.predicate(
    "lifted_at should be null for active restriction",
    restriction.lifted_at === null,
  );

  // Step 4: Lift the restriction and validate status transition
  const liftReason = RandomGenerator.paragraph({ sentences: 3 });
  const liftedRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
      connection,
      {
        contributorId: contributor.id,
        body: {
          lifted_reason: liftReason,
        } satisfies IDiscussionBoardAccountRestriction.IUpdate,
      },
    );
  typia.assert(liftedRestriction);

  // Validate status transition to 'lifted'
  TestValidator.equals(
    "restriction status should be lifted",
    liftedRestriction.status,
    "lifted",
  );

  // Validate lifted_at timestamp is set
  TestValidator.predicate(
    "lifted_at should be set after lifting",
    liftedRestriction.lifted_at !== null,
  );

  // Validate lifted_by_moderator is populated
  TestValidator.predicate(
    "lifted_by_moderator should not be null",
    liftedRestriction.lifted_by_moderator !== null,
  );
  if (liftedRestriction.lifted_by_moderator !== null) {
    TestValidator.equals(
      "lifted_by_moderator should be the lifting moderator",
      liftedRestriction.lifted_by_moderator.id,
      moderator.id,
    );
  }

  // Validate historical record is preserved
  TestValidator.equals(
    "restriction ID should remain unchanged",
    liftedRestriction.id,
    restriction.id,
  );
  TestValidator.equals(
    "restriction_type should remain unchanged",
    liftedRestriction.restriction_type,
    restriction.restriction_type,
  );
  TestValidator.equals(
    "reason should remain unchanged",
    liftedRestriction.reason,
    restriction.reason,
  );
  TestValidator.equals(
    "contributor should remain unchanged",
    liftedRestriction.contributor.id,
    restriction.contributor.id,
  );
  TestValidator.equals(
    "imposed_by_moderator should remain unchanged",
    liftedRestriction.imposed_by_moderator.id,
    restriction.imposed_by_moderator.id,
  );
  TestValidator.equals(
    "imposed_at should remain unchanged",
    liftedRestriction.imposed_at,
    restriction.imposed_at,
  );
  TestValidator.equals(
    "expires_at should remain unchanged",
    liftedRestriction.expires_at,
    restriction.expires_at,
  );

  // Validate distinction between 'lifted' and 'expired' status
  TestValidator.notEquals(
    "lifted status should differ from expired",
    liftedRestriction.status,
    "expired",
  );
  TestValidator.predicate(
    "status should be exactly 'lifted'",
    liftedRestriction.status === "lifted",
  );
}
