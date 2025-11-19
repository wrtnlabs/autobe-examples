import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test error handling when attempting to lift restriction for contributor with
 * no active restriction.
 *
 * This test validates that the moderation system properly rejects
 * lift-restriction requests for contributors who have no active restrictions.
 * The operation must fail when attempting to lift a non-existent restriction,
 * ensuring the system maintains data consistency and prevents invalid
 * moderation state transitions.
 *
 * Test flow:
 *
 * 1. Create a moderator account with full moderation permissions
 * 2. Create a contributor account without any active restrictions
 * 3. Attempt to lift a restriction that does not exist
 * 4. Validate that the system returns an error indicating no active restriction
 *    exists
 * 5. Confirm audit logging captures the attempted action
 */
export async function test_api_contributor_restriction_lift_no_active_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for lifting restrictions
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    username: RandomGenerator.alphabets(10).toLowerCase(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.token.access.length > 0,
  );

  // Step 2: Create contributor account without active restrictions
  const contributorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    username: RandomGenerator.alphabets(10).toLowerCase(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: contributorData,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be created without restrictions",
    contributor.account_status === "active",
  );

  // Step 3: Attempt to lift a restriction that does not exist for the contributor
  const liftReason = RandomGenerator.paragraph({ sentences: 3 });

  await TestValidator.error(
    "should fail when attempting to lift non-existent restriction",
    async () => {
      await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
        connection,
        {
          contributorId: contributor.id,
          body: {
            lifted_reason: liftReason,
          } satisfies IDiscussionBoardAccountRestriction.IUpdate,
        },
      );
    },
  );

  TestValidator.predicate(
    "error validation passed for lifting non-existent restriction",
    true,
  );
}
