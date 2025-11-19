import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test comprehensive documentation of lift decision through lifted_reason
 * field.
 *
 * Validates that when a moderator lifts a contributor's restriction, the lift
 * decision is properly documented with a lifted_reason field that explains the
 * reasoning. This test ensures audit trail completeness and proper
 * communication of moderation decisions.
 *
 * The test flow:
 *
 * 1. Create a moderator account for restriction management
 * 2. Create a contributor account to be restricted
 * 3. Apply a restriction to the contributor with clear reasoning
 * 4. Lift the restriction with detailed documentation of the lift decision
 * 5. Verify the lift was processed with proper audit trail
 * 6. Validate the complete restriction lifecycle with documented lift decision
 */
export async function test_api_contributor_restriction_lift_decision_documentation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for restriction management
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password:
          RandomGenerator.alphabets(4) +
          RandomGenerator.alphabets(4).toUpperCase() +
          "1@",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create contributor account to be restricted
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password:
          RandomGenerator.alphabets(4) +
          RandomGenerator.alphabets(4).toUpperCase() +
          "1@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Switch to moderator context
  connection.headers ??= {};
  connection.headers.Authorization = moderator.token.access;

  // Step 3: Apply posting restriction to contributor
  const restrictionReason =
    "Violation of community guidelines: inappropriate language and harassment in comments";
  const restriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.restrict(
      connection,
      {
        contributorId: contributor.id,
        body: {
          discussion_board_contributor_id: contributor.id,
          restriction_type: "posting_restriction",
          reason: restrictionReason,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.ICreate,
      },
    );
  typia.assert(restriction);

  // Validate initial restriction state
  TestValidator.equals(
    "restriction type is posting_restriction",
    restriction.restriction_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "restriction reason documented",
    restriction.reason,
    restrictionReason,
  );
  TestValidator.predicate(
    "restriction is active",
    restriction.status === "active",
  );
  TestValidator.predicate(
    "lifted_at is null initially",
    restriction.lifted_at === null,
  );
  TestValidator.predicate(
    "lifted_by_moderator is null initially",
    restriction.lifted_by_moderator === null,
  );

  // Step 4: Lift the restriction with detailed documentation
  const liftedReason =
    "Contributor has completed behavioral rehabilitation program and demonstrated improved conduct in recent posts. Evidence of positive engagement in community discussions indicates successful behavior correction.";

  const liftedRestriction: IDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
      connection,
      {
        contributorId: contributor.id,
        body: {
          lifted_reason: liftedReason,
        } satisfies IDiscussionBoardAccountRestriction.IUpdate,
      },
    );
  typia.assert(liftedRestriction);

  // Step 5: Validate lift decision was processed and audit trail updated
  TestValidator.predicate(
    "lifted_reason was submitted with valid length",
    liftedReason.length <= 500,
  );
  TestValidator.predicate(
    "restriction status changed to lifted",
    liftedRestriction.status === "lifted",
  );
  TestValidator.predicate(
    "lifted_at timestamp is set after lift",
    liftedRestriction.lifted_at !== null,
  );
  TestValidator.predicate(
    "lifted_by_moderator is documented",
    liftedRestriction.lifted_by_moderator !== null,
  );

  // Step 6: Verify complete audit trail
  if (liftedRestriction.lifted_by_moderator !== null) {
    TestValidator.equals(
      "moderator id matches",
      liftedRestriction.lifted_by_moderator.id,
      moderator.id,
    );
    TestValidator.equals(
      "moderator username documented",
      liftedRestriction.lifted_by_moderator.username,
      moderator.username,
    );
  }

  // Validate restriction lifecycle completeness
  TestValidator.predicate(
    "original restriction reason preserved",
    liftedRestriction.reason === restrictionReason,
  );
  TestValidator.equals(
    "contributor reference unchanged",
    liftedRestriction.contributor.id,
    contributor.id,
  );
  TestValidator.equals(
    "imposed_by_moderator unchanged",
    liftedRestriction.imposed_by_moderator.id,
    moderator.id,
  );

  // Verify lift action completed successfully
  TestValidator.predicate(
    "lifted_at has valid timestamp",
    typeof liftedRestriction.lifted_at === "string",
  );
}
