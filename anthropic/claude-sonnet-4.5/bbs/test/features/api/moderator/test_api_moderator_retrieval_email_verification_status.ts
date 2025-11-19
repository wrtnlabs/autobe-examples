import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator retrieval accurately reflects email verification status.
 *
 * This test validates that the moderator retrieval endpoint correctly shows the
 * initial email verification state after account creation:
 *
 * 1. Create moderator account (initially email_verified=false,
 *    email_verified_at=null)
 * 2. Retrieve moderator profile and verify unverified state
 * 3. Validate that retrieval consistently shows unverified status
 *
 * Note: Full email verification workflow testing (request token -> verify ->
 * check verified state) requires test infrastructure to retrieve verification
 * tokens from email or database, which is beyond the scope of this basic E2E
 * test. This test focuses on verifying that the retrieval endpoint correctly
 * reflects the initial unverified state.
 */
export async function test_api_moderator_retrieval_email_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with unverified email
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.alphaNumeric(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authorizedModerator);

  // Step 2: Retrieve moderator profile - should show unverified state
  const moderatorProfile: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: authorizedModerator.id,
    });
  typia.assert(moderatorProfile);

  // Step 3: Validate initial unverified state
  TestValidator.equals(
    "email_verified should be false for newly created moderator",
    moderatorProfile.email_verified,
    false,
  );

  TestValidator.equals(
    "email_verified_at should be null for unverified moderator",
    moderatorProfile.email_verified_at,
    null,
  );

  // Validate that moderator ID matches
  TestValidator.equals(
    "retrieved moderator ID should match created moderator ID",
    moderatorProfile.id,
    authorizedModerator.id,
  );

  // Validate that email matches
  TestValidator.equals(
    "retrieved moderator email should match registration email",
    moderatorProfile.email,
    moderatorData.email,
  );

  // Validate that username matches
  TestValidator.equals(
    "retrieved moderator username should match registration username",
    moderatorProfile.username,
    moderatorData.username,
  );

  // Retrieve profile again to ensure consistency
  const secondRetrieval: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: authorizedModerator.id,
    });
  typia.assert(secondRetrieval);

  // Verify consistent unverified state on second retrieval
  TestValidator.equals(
    "email_verified should remain false on subsequent retrieval",
    secondRetrieval.email_verified,
    false,
  );

  TestValidator.equals(
    "email_verified_at should remain null on subsequent retrieval",
    secondRetrieval.email_verified_at,
    null,
  );
}
