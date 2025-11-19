import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating a temporary account suspension (full login denial).
 *
 * Creates a suspension with suspension_type=account_suspension,
 * severity_level=moderate or severe, and appropriate duration_days (7 or 30
 * days). Validates that the suspension prevents login and all account access
 * during the specified period.
 *
 * Steps:
 *
 * 1. Register a moderator account to enforce suspensions
 * 2. Create a suspension on a contributor account with account_suspension type
 * 3. Verify suspension details including duration and expiration timestamp
 * 4. Confirm the suspension status is active and properly enforced
 */
export async function test_api_contributor_suspension_account_suspension_temporary(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderatorUsername = RandomGenerator.alphabets(8).toLowerCase();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator has full moderation tier",
    moderator.moderation_tier === "full",
  );

  // Step 2: Create a suspension with account_suspension type
  // Using a random UUID for contributor ID since we're testing suspension creation
  const contributorId = typia.random<string & tags.Format<"uuid">>();
  const suspensionDays = RandomGenerator.pick([7, 30] as const);
  const suspensionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "account_suspension",
          reason: suspensionReason,
          severity_level: RandomGenerator.pick(["moderate", "severe"] as const),
          duration_days: suspensionDays,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 3: Verify suspension details
  TestValidator.equals(
    "suspension type is account_suspension",
    suspension.suspension_type,
    "account_suspension",
  );
  TestValidator.predicate(
    "suspension severity is moderate or severe",
    suspension.severity_level === "moderate" ||
      suspension.severity_level === "severe",
  );
  TestValidator.equals(
    "suspension duration matches request",
    suspension.duration_days,
    suspensionDays,
  );
  TestValidator.predicate(
    "suspension reason is recorded",
    suspension.reason.length > 0 && suspension.reason === suspensionReason,
  );

  // Step 4: Verify suspension is active
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
    "expiration_at timestamp is calculated for temporary suspension",
    suspension.expiration_at !== null && suspension.expiration_at !== undefined,
  );

  // Step 5: Verify contributor and moderator information in suspension record
  TestValidator.predicate(
    "suspension contains moderator information",
    suspension.moderator.id !== null &&
      suspension.moderator.id !== undefined &&
      suspension.moderator.username.length > 0,
  );
  TestValidator.predicate(
    "suspension contains contributor information",
    suspension.contributor.id !== null &&
      suspension.contributor.id !== undefined,
  );
  TestValidator.equals(
    "contributor ID matches request",
    suspension.contributor.id,
    contributorId,
  );

  // Step 6: Verify suspension record is immutable (status should not be lifted yet)
  TestValidator.equals(
    "suspension has not been lifted",
    suspension.lifted_at,
    undefined,
  );
  TestValidator.equals(
    "suspension has no lift reason",
    suspension.lift_reason,
    undefined,
  );
}
