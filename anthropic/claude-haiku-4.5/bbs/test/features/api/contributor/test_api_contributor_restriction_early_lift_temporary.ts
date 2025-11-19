import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test early lifting of temporary restriction before automatic expiration date.
 *
 * Validates the workflow of applying a temporary posting restriction to a
 * contributor and then manually lifting it before the scheduled expiration. The
 * test ensures that:
 *
 * - Moderators can impose temporary restrictions with future expiration dates
 * - Restrictions can be lifted early with documented reasons
 * - Lifted_at timestamp is set to the current lift time (not the original
 *   expiration)
 * - Lifted_by_moderator_id correctly identifies the moderator who performed the
 *   lift
 * - Status transitions from 'active' to 'lifted' upon early removal
 * - Lifted_reason documents the decision (rehabilitation or correction)
 * - Contributors can immediately resume normal activity after early lift
 *
 * Steps:
 *
 * 1. Create first moderator account (will impose restriction)
 * 2. Create contributor account (will be restricted)
 * 3. Apply temporary posting restriction with future expiration
 * 4. Create second moderator account (will lift restriction)
 * 5. Lift the restriction early with rehabilitation reason
 * 6. Validate the restriction record reflects the early lift
 * 7. Verify status change and moderator tracking
 * 8. Verify lifted restriction was before original expiration
 */
export async function test_api_contributor_restriction_early_lift_temporary(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account to impose restriction
  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);
  TestValidator.predicate(
    "first moderator should be active",
    moderator1.account_status === "active",
  );

  // Step 2: Create contributor account to be restricted
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ContribPass123!",
        username: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be active initially",
    contributor.account_status === "active",
  );

  // Step 3: Apply temporary posting restriction with future expiration
  const futureExpirationDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "posting_restriction",
          reason:
            "Violation of community guidelines - inappropriate content posted",
          expires_at: futureExpirationDate,
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);
  TestValidator.equals(
    "restriction should be active initially",
    restriction.status,
    "active",
  );
  TestValidator.equals(
    "restriction should target the correct contributor",
    restriction.contributor.id,
    contributor.id,
  );
  TestValidator.equals(
    "restriction type should be posting_restriction",
    restriction.restriction_type,
    "posting_restriction",
  );
  TestValidator.predicate(
    "lifted_at should be null for active restriction",
    restriction.lifted_at === null,
  );

  // Step 4: Create second moderator account to lift restriction
  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass456!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 5: Lift the restriction early with rehabilitation reason
  const liftedRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
      connection,
      {
        contributorId: contributor.id,
        body: {
          lifted_reason:
            "Contributor has demonstrated understanding and commitment to follow community guidelines. Restriction applied in error can now be lifted.",
        } satisfies IDiscussionBoardAccountRestriction.IUpdate,
      },
    );
  typia.assert(liftedRestriction);

  // Step 6: Validate the restriction record reflects the early lift
  TestValidator.equals(
    "status should change to lifted",
    liftedRestriction.status,
    "lifted",
  );
  TestValidator.predicate(
    "lifted_at should be set to current time",
    liftedRestriction.lifted_at !== null,
  );
  TestValidator.equals(
    "restriction should target correct contributor",
    liftedRestriction.contributor.id,
    contributor.id,
  );
  TestValidator.equals(
    "restriction type should remain posting_restriction",
    liftedRestriction.restriction_type,
    "posting_restriction",
  );

  // Step 7: Verify status change and moderator tracking
  TestValidator.equals(
    "imposed_by_moderator should be the first moderator",
    liftedRestriction.imposed_by_moderator.id,
    moderator1.id,
  );
  typia.assertGuard<IDiscussionBoardModerator.ISummary>(
    liftedRestriction.lifted_by_moderator!,
  );
  TestValidator.equals(
    "lifted_by_moderator should be the second moderator",
    liftedRestriction.lifted_by_moderator.id,
    moderator2.id,
  );

  // Step 8: Verify lifted restriction was before original expiration
  TestValidator.predicate(
    "lifted_at should be before original expiration",
    new Date(liftedRestriction.lifted_at!).getTime() <
      new Date(futureExpirationDate).getTime(),
  );
}
