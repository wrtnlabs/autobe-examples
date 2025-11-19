import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that moderator information is captured in suspension record.
 *
 * This test validates that when a moderator creates a suspension for a
 * contributor, the suspension record properly captures the authenticating
 * moderator's identity (id and username) for accountability and audit trail
 * purposes.
 *
 * Workflow:
 *
 * 1. Create moderator account (establishes authentication context)
 * 2. Create suspension on a random contributor with specific enforcement details
 * 3. Verify that the suspension record's moderator field contains the
 *    authenticated moderator's id and username
 * 4. Validate suspension details and moderator accountability tracking
 */
export async function test_api_contributor_suspension_moderator_context(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(8);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate random contributor ID and create suspension
  const contributorId: string = typia.random<string & tags.Format<"uuid">>();

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason:
            "Violation of community guidelines: inappropriate language and harassment",
          severity_level: "moderate",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 3: Verify moderator identification in suspension record
  TestValidator.equals(
    "suspension moderator id matches authenticated moderator",
    suspension.moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "suspension moderator username matches authenticated moderator",
    suspension.moderator.username,
    moderator.username,
  );

  // Step 4: Validate suspension details and accountability tracking
  TestValidator.equals(
    "suspension contributor id matches requested contributor",
    suspension.contributor.id,
    contributorId,
  );

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
    "suspension status is active",
    suspension.status,
    "active",
  );

  TestValidator.predicate(
    "suspension contains suspension timestamp",
    suspension.suspended_at.length > 0,
  );

  TestValidator.equals(
    "suspension duration is 7 days",
    suspension.duration_days,
    7,
  );
}
