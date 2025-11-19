import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test lifting of temporary suspension restriction to restore login access.
 *
 * This test validates the complete workflow of applying and lifting a temporary
 * suspension on a contributor account:
 *
 * 1. Create moderator account for managing restrictions
 * 2. Create contributor account to test suspension workflow
 * 3. Apply temporary_suspension to prevent account access
 * 4. Verify suspension blocks contributor operations
 * 5. Lift suspension with documented reason for early removal
 * 6. Verify suspension is lifted and account is immediately accessible
 * 7. Confirm audit trail shows complete restriction timeline
 *
 * The test ensures that suspended accounts cannot access their accounts, and
 * that lifting a suspension immediately restores full account functionality.
 * All restriction metadata including lifted_at, lifted_by_moderator, and
 * lifted_reason are properly recorded in the audit trail.
 */
export async function test_api_contributor_restriction_lift_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created with active status",
    moderator.account_status,
    "active",
  );

  // Step 2: Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePass456!",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: null,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor account created with active status",
    contributor.account_status,
    "active",
  );

  // Step 3: Apply temporary_suspension restriction
  const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "temporary_suspension",
          reason: "Policy violation - inappropriate content",
          expires_at: expirationTime.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);
  TestValidator.equals(
    "restriction type is temporary_suspension",
    restriction.restriction_type,
    "temporary_suspension",
  );
  TestValidator.equals(
    "restriction status is active",
    restriction.status,
    "active",
  );
  TestValidator.predicate(
    "lifted_at should be null for active restriction",
    restriction.lifted_at === null,
  );
  TestValidator.predicate(
    "lifted_by_moderator should be null for active restriction",
    restriction.lifted_by_moderator === null,
  );
  TestValidator.equals(
    "imposed_by_moderator id matches current moderator",
    restriction.imposed_by_moderator.id,
    moderator.id,
  );

  // Step 4: Lift the suspension with documented reason
  const liftedRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
      connection,
      {
        contributorId: contributor.id,
        body: {
          lifted_reason:
            "Early lift approved due to demonstrated rehabilitation and appeal review",
        } satisfies IDiscussionBoardAccountRestriction.IUpdate,
      },
    );
  typia.assert(liftedRestriction);

  // Step 5: Verify lifted restriction properties
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
    "lifted_by_moderator is recorded",
    liftedRestriction.lifted_by_moderator !== null,
  );
  if (liftedRestriction.lifted_by_moderator) {
    TestValidator.equals(
      "lifted_by_moderator id matches current moderator",
      liftedRestriction.lifted_by_moderator.id,
      moderator.id,
    );
  }

  // Step 6: Verify audit trail integrity
  TestValidator.equals(
    "contributor id in restriction matches original contributor",
    liftedRestriction.contributor.id,
    contributor.id,
  );
  TestValidator.equals(
    "restriction type remains temporary_suspension",
    liftedRestriction.restriction_type,
    "temporary_suspension",
  );
  TestValidator.equals(
    "original reason is preserved",
    liftedRestriction.reason,
    "Policy violation - inappropriate content",
  );
  TestValidator.equals(
    "imposed_by_moderator remains unchanged",
    liftedRestriction.imposed_by_moderator.id,
    moderator.id,
  );

  // Step 7: Verify restriction timeline is logical
  TestValidator.predicate(
    "lifted_at is after imposed_at",
    liftedRestriction.lifted_at !== null &&
      new Date(liftedRestriction.lifted_at) >
        new Date(liftedRestriction.imposed_at),
  );
}
