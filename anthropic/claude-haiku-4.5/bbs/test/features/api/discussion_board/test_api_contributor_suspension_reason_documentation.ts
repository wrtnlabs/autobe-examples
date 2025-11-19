import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Validates that suspension reason is properly stored and documented.
 *
 * This test creates a suspension with a detailed reason explaining specific
 * policy violations and escalation context. It validates that:
 *
 * 1. The reason field accepts up to 1000 characters
 * 2. The reason is stored correctly and retrievable in the suspension record
 * 3. The reason field documentation meets moderator transparency requirements
 * 4. Moderators can document comprehensive violation context for accountability
 *
 * The test workflow:
 *
 * 1. Authenticate as a moderator to create suspensions
 * 2. Create a contributor account to suspend
 * 3. Create a suspension with a detailed, comprehensive reason
 * 4. Verify the suspension record contains the exact reason provided
 * 5. Validate the reason respects the 1000 character maximum length
 */
export async function test_api_contributor_suspension_reason_documentation(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a contributor to suspend (simulate by generating a UUID)
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create suspension with comprehensive reason documentation
  const detailedReason = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });

  // Ensure reason is within 1000 character limit
  const truncatedReason =
    detailedReason.length > 1000
      ? detailedReason.substring(0, 1000)
      : detailedReason;

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId,
        body: {
          suspension_type: "account_suspension",
          reason: truncatedReason,
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 4. Verify the reason is stored correctly
  TestValidator.equals(
    "suspension reason matches input reason",
    suspension.reason,
    truncatedReason,
  );

  // 5. Validate reason length constraint
  TestValidator.predicate(
    "reason length does not exceed 1000 characters",
    suspension.reason.length <= 1000,
  );

  // 6. Verify moderator is recorded for accountability
  TestValidator.equals(
    "moderator is recorded in suspension",
    suspension.moderator.id,
    moderator.id,
  );

  // 7. Verify suspension has all required documentation fields
  TestValidator.predicate(
    "suspension has non-empty reason",
    suspension.reason.length > 0,
  );

  TestValidator.equals(
    "suspension type matches request",
    suspension.suspension_type,
    "account_suspension",
  );

  TestValidator.equals(
    "severity level is documented",
    suspension.severity_level,
    "moderate",
  );

  // 8. Test with maximum length reason to ensure storage capacity
  const maxLengthReason = RandomGenerator.alphabets(1000);

  const maxLengthSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          suspension_type: "posting_restriction",
          reason: maxLengthReason,
          severity_level: "minor",
          duration_days: 3,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(maxLengthSuspension);

  TestValidator.equals(
    "maximum length reason is stored exactly",
    maxLengthSuspension.reason.length,
    1000,
  );

  // 9. Verify suspension record structure for transparency compliance
  TestValidator.predicate(
    "suspension has contributor information",
    maxLengthSuspension.contributor !== null &&
      maxLengthSuspension.contributor !== undefined,
  );

  TestValidator.predicate(
    "suspension has moderator information",
    maxLengthSuspension.moderator !== null &&
      maxLengthSuspension.moderator !== undefined,
  );

  TestValidator.predicate(
    "suspension has suspended_at timestamp",
    maxLengthSuspension.suspended_at !== null &&
      maxLengthSuspension.suspended_at !== undefined,
  );
}
