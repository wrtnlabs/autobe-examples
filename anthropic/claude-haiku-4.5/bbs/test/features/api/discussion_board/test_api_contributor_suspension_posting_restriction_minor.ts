import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating a posting restriction suspension for a minor violation (first
 * offense).
 *
 * This test validates the moderator's ability to suspend a contributor's
 * posting capabilities while maintaining their login access. The scenario
 * involves:
 *
 * 1. A moderator registering their account
 * 2. A contributor being identified (using random UUID for testing)
 * 3. Moderator issuing a posting restriction suspension with minor severity and
 *    3-day duration
 * 4. Validation of the suspension record containing correct enforcement parameters
 *
 * The test ensures that:
 *
 * - Suspension is created with posting_restriction type (prevents article/comment
 *   posting)
 * - Severity level is set to "minor" for first-time violations
 * - Duration is 3 days with proper expiration timestamp calculation
 * - Suspension reason is documented for transparency
 * - Suspension status is "active" and immediately effective
 * - Response includes moderator and contributor information
 */
export async function test_api_contributor_suspension_posting_restriction_minor(
  connection: api.IConnection,
) {
  // 1. Moderator registration for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a suspension for a contributor with posting restriction (minor violation)
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          severity_level: "minor",
          duration_days: 3,
          reason:
            "First-time violation: Inappropriate content in article posting. User suspended from creating new articles and comments for 3 days to prevent further violations.",
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 3. Validate suspension record properties
  TestValidator.equals(
    "suspension type is posting_restriction",
    suspension.suspension_type,
    "posting_restriction",
  );

  TestValidator.equals(
    "severity level is minor",
    suspension.severity_level,
    "minor",
  );

  TestValidator.equals("duration is 3 days", suspension.duration_days, 3);

  TestValidator.equals(
    "suspension status is active",
    suspension.status,
    "active",
  );

  TestValidator.predicate(
    "contributor ID matches in suspension record",
    suspension.contributor.id === contributorId,
  );

  TestValidator.predicate(
    "moderator ID matches authenticated moderator",
    suspension.moderator.id === moderator.id,
  );

  TestValidator.predicate(
    "suspension has expiration timestamp",
    suspension.expiration_at !== null && suspension.expiration_at !== undefined,
  );

  TestValidator.predicate(
    "suspended_at timestamp is set",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );

  TestValidator.predicate(
    "lift_reason is null for active suspension",
    suspension.lift_reason === null || suspension.lift_reason === undefined,
  );

  TestValidator.predicate(
    "lifted_at is null for active suspension",
    suspension.lifted_at === null || suspension.lifted_at === undefined,
  );

  TestValidator.predicate(
    "reason documents the violation",
    suspension.reason.includes("Inappropriate content"),
  );
}
