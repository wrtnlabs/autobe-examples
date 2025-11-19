import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating a posting restriction for moderate violation (repeated
 * offenses).
 *
 * This test validates that a moderator can successfully enforce a posting
 * restriction on a contributor account for policy violations. The suspension is
 * created with suspension_type=posting_restriction, severity_level=moderate,
 * and duration_days=7, representing a typical escalation action for repeated
 * minor violations or a single moderate violation.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account for enforcement actions
 * 2. Create a suspension record for a contributor with posting restrictions
 * 3. Verify the suspension response contains correct enforcement details
 * 4. Validate suspension type, severity level, and 7-day duration are properly set
 * 5. Confirm the suspension status is 'active' with valid timestamps
 * 6. Verify the moderator reference is included in the suspension record
 * 7. Validate that optional lifted fields are null for active suspension
 */
export async function test_api_contributor_suspension_posting_restriction_moderate(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string =
    RandomGenerator.alphabets(3).toUpperCase() +
    RandomGenerator.alphabets(3) +
    RandomGenerator.alphaNumeric(1) +
    "!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Create a suspension for a contributor with posting restriction
  const contributorId: string = typia.random<string & tags.Format<"uuid">>();
  const violationReason: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason: violationReason,
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 3: Validate suspension response structure and content
  TestValidator.equals(
    "suspension type is posting_restriction",
    suspension.suspension_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "suspension severity level is moderate",
    suspension.severity_level,
    "moderate",
  );
  TestValidator.equals(
    "suspension duration is 7 days",
    suspension.duration_days,
    7,
  );
  TestValidator.equals(
    "suspension reason matches input",
    suspension.reason,
    violationReason,
  );

  // Step 4: Validate suspension status and timestamps
  TestValidator.equals(
    "suspension status is active",
    suspension.status,
    "active",
  );
  TestValidator.predicate(
    "suspended_at timestamp is set",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );
  TestValidator.predicate(
    "expiration_at timestamp is set for time-limited suspension",
    suspension.expiration_at !== null && suspension.expiration_at !== undefined,
  );

  // Step 5: Validate moderator reference in suspension
  TestValidator.equals(
    "moderator id matches suspension moderator",
    suspension.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator username matches suspension moderator",
    suspension.moderator.username,
    moderator.username,
  );

  // Step 6: Validate contributor reference in suspension
  TestValidator.equals(
    "contributor id matches request parameter",
    suspension.contributor.id,
    contributorId,
  );

  // Step 7: Validate optional lifted fields are null for active suspension
  TestValidator.predicate(
    "lifted_at is null for active suspension",
    suspension.lifted_at === null || suspension.lifted_at === undefined,
  );
  TestValidator.predicate(
    "lift_reason is null for active suspension",
    suspension.lift_reason === null || suspension.lift_reason === undefined,
  );
}
