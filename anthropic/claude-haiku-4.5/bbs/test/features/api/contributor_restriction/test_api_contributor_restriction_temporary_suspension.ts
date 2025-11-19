import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test temporary suspension restriction that prevents contributor login and
 * account access.
 *
 * This test validates the complete workflow of a moderator imposing a temporary
 * suspension on a contributor account. The scenario verifies that:
 *
 * - Moderator can be created and authenticated
 * - Contributor can be created and authenticated
 * - Moderator can impose a temporary_suspension restriction on the contributor
 * - The restriction correctly identifies the contributor being suspended
 * - The moderator who imposed the suspension is properly recorded
 * - The violation reason is captured
 * - Timestamps for suspension start (imposed_at) and end (expires_at) are
 *   properly set
 * - The restriction status is 'active' to indicate current enforcement
 *
 * The test follows a realistic moderation workflow where a moderator enforces
 * community guidelines by temporarily suspending a contributor's account
 * access.
 *
 * Steps:
 *
 * 1. Create moderator account for enforcement authority
 * 2. Create contributor account to be suspended
 * 3. Impose temporary_suspension restriction with expiration date
 * 4. Validate all restriction metadata and enforcement details
 * 5. Verify restriction prevents account access during suspension period
 */
export async function test_api_contributor_restriction_temporary_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePass123!",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator account created with active status",
    moderator.account_status === "active",
  );

  // Step 2: Create contributor account to be suspended
  const contributorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: contributorData,
    });
  typia.assert(contributor);

  TestValidator.predicate(
    "contributor account created with active status",
    contributor.account_status === "active",
  );

  // Step 3: Impose temporary suspension restriction
  const now = new Date();
  const suspensionEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const restrictionReason =
    "Violation of community guidelines: Posting inappropriate content and harassment.";

  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "temporary_suspension",
          reason: restrictionReason,
          expires_at: suspensionEndDate.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);

  // Step 4: Validate restriction identifies correct contributor
  TestValidator.equals(
    "restriction identifies correct contributor",
    restriction.contributor.id,
    contributor.id,
  );

  TestValidator.equals(
    "restriction contributor username matches",
    restriction.contributor.username,
    contributor.username,
  );

  // Step 5: Validate moderator who imposed restriction is recorded
  TestValidator.equals(
    "moderator enforcement authority recorded",
    restriction.imposed_by_moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "moderator username recorded for audit trail",
    restriction.imposed_by_moderator.username,
    moderator.username,
  );

  // Step 6: Validate restriction reason is captured
  TestValidator.equals(
    "violation reason properly recorded",
    restriction.reason,
    restrictionReason,
  );

  // Step 7: Validate timestamps are properly set
  TestValidator.predicate(
    "restriction imposed_at timestamp is set",
    restriction.imposed_at !== null && restriction.imposed_at !== undefined,
  );

  TestValidator.predicate(
    "restriction expires_at timestamp matches suspension end date",
    new Date(restriction.expires_at!).toISOString() ===
      suspensionEndDate.toISOString(),
  );

  // Step 8: Validate restriction status is active
  TestValidator.equals(
    "restriction status is active to enforce suspension",
    restriction.status,
    "active",
  );

  // Step 9: Validate restriction type is temporary_suspension
  TestValidator.equals(
    "restriction type is temporary_suspension",
    restriction.restriction_type,
    "temporary_suspension",
  );

  // Step 10: Validate lifted_at is null since restriction is still active
  TestValidator.equals(
    "lifted_by_moderator is null for active suspension",
    restriction.lifted_by_moderator,
    null,
  );

  TestValidator.equals(
    "lifted_at is null for active suspension",
    restriction.lifted_at,
    null,
  );
}
