import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test comprehensive violation reason documentation that communicates
 * enforcement decisions to restricted contributors.
 *
 * This test validates that moderators can impose account restrictions with
 * detailed violation reasons that clearly communicate policy violations and
 * enforcement decisions. The test verifies:
 *
 * 1. Moderator and contributor account creation for the restriction scenario
 * 2. Imposing a posting restriction with a detailed violation reason (up to 500
 *    characters)
 * 3. Validation that the reason field is properly stored with full detail
 * 4. Verification that the documented violation reason appears in the restriction
 *    record
 * 5. Confirmation that restriction metadata includes moderator information and
 *    enforcement timestamps
 *
 * Steps:
 *
 * 1. Create a moderator account to document violations
 * 2. Create a contributor account to apply restrictions against
 * 3. Impose a posting restriction with detailed violation reason
 * 4. Retrieve the restriction record and validate the reason is preserved
 * 5. Confirm restriction metadata is complete for compliance review
 */
export async function test_api_contributor_restriction_violation_reason_documentation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 2: Create contributor account
  const contributorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: contributorBody,
    });
  typia.assert(contributor);

  // Step 3: Impose posting restriction with detailed violation reason
  const violationReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 500);

  const restrictionBody = {
    discussion_board_contributor_id: contributor.id,
    restriction_type: "posting_restriction" as const,
    reason: violationReason,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IDiscussionBoardAccountRestriction.ICreate;

  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: restrictionBody,
      },
    );
  typia.assert(restriction);

  // Step 4: Validate restriction record contains complete violation documentation
  TestValidator.equals(
    "restriction type matches posting_restriction",
    restriction.restriction_type,
    "posting_restriction",
  );

  TestValidator.equals(
    "violation reason is preserved exactly",
    restriction.reason,
    violationReason,
  );

  TestValidator.equals(
    "restriction status is active",
    restriction.status,
    "active",
  );

  // Step 5: Validate restriction metadata for compliance review
  TestValidator.predicate(
    "imposed_by_moderator is documented",
    restriction.imposed_by_moderator !== null,
  );

  TestValidator.equals(
    "imposed_by_moderator id matches",
    restriction.imposed_by_moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "contributor id matches restriction",
    restriction.contributor.id,
    contributor.id,
  );

  TestValidator.predicate(
    "imposed_at timestamp is set",
    restriction.imposed_at !== null && restriction.imposed_at !== undefined,
  );

  TestValidator.predicate(
    "expires_at timestamp is set for temporary restriction",
    restriction.expires_at !== null && restriction.expires_at !== undefined,
  );

  TestValidator.predicate(
    "reason length is within maximum constraint",
    restriction.reason.length <= 500,
  );

  TestValidator.predicate(
    "reason is descriptive and non-empty",
    restriction.reason.length > 0,
  );
}
