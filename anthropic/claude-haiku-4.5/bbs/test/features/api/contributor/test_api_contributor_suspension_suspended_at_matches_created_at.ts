import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that suspended_at timestamp matches or is very close to created_at
 * timestamp. Validates that suspension becomes effective immediately upon
 * creation without delay or staging period.
 *
 * This test verifies the atomicity of the suspension operation:
 *
 * 1. Register a moderator account
 * 2. Create a suspension for a contributor
 * 3. Verify that suspended_at and created_at are synchronized (within 1 second
 *    tolerance)
 * 4. Confirm the suspension was created atomically without staging delays
 */
export async function test_api_contributor_suspension_suspended_at_matches_created_at(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a suspension for a contributor
  // Generate a random contributor ID (UUID format)
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  const suspensionRecord: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "account_suspension",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspensionRecord);

  // Step 3: Verify that suspended_at and created_at timestamps are synchronized
  const suspendedAtTime = new Date(suspensionRecord.suspended_at).getTime();
  const createdAtTime = new Date(suspensionRecord.created_at).getTime();
  const timeDifference = Math.abs(suspendedAtTime - createdAtTime);

  // Allow 1 second tolerance for timestamp synchronization
  TestValidator.predicate(
    "suspended_at and created_at should be synchronized within 1 second",
    timeDifference < 1000,
  );

  // Step 4: Verify the suspension was created atomically
  TestValidator.predicate(
    "suspension status should be active immediately",
    suspensionRecord.status === "active",
  );

  TestValidator.predicate(
    "suspension type should be account_suspension",
    suspensionRecord.suspension_type === "account_suspension",
  );

  TestValidator.predicate(
    "moderator should be recorded",
    suspensionRecord.moderator !== null &&
      suspensionRecord.moderator !== undefined,
  );

  TestValidator.predicate(
    "contributor should be recorded",
    suspensionRecord.contributor !== null &&
      suspensionRecord.contributor !== undefined,
  );
}
