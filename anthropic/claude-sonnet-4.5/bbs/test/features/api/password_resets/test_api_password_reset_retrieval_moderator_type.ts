import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test moderator's ability to retrieve password reset information for moderator
 * account resets.
 *
 * This test validates the complete workflow of password reset retrieval for
 * moderator accounts:
 *
 * 1. Create a first moderator account that will be the target of password reset
 * 2. Initiate a password reset request for that moderator with
 *    actor_type='moderator'
 * 3. Authenticate as a second moderator to test retrieval permissions
 * 4. Retrieve the password reset record and validate all fields
 * 5. Verify the polymorphic ownership pattern with moderator actor_type
 *    discriminator
 *
 * The test ensures that:
 *
 * - Moderators can review password reset requests for other moderator accounts
 * - The actor_type discriminator correctly identifies this as a moderator reset
 * - All password reset metadata (email, expiration, creation time, usage status)
 *   is accurate
 * - The polymorphic relationship through
 *   discussion_board_password_reset_of_moderators is maintained
 * - Security auditing and administrative oversight capabilities are properly
 *   implemented
 */
export async function test_api_password_reset_retrieval_moderator_type(
  connection: api.IConnection,
) {
  // Step 1: Create the first moderator account (target of password reset)
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorPassword = "SecurePassword123!";

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: firstModeratorPassword,
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Step 2: Initiate password reset for the first moderator
  const passwordResetRequest: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.passwordResets.create(connection, {
      body: {
        actor_type: "moderator",
        email: firstModeratorEmail,
      } satisfies IDiscussionBoardPasswordReset.ICreate,
    });
  typia.assert(passwordResetRequest);

  // Step 3: Create a second moderator account for retrieval testing
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();

  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondModeratorEmail,
        password: "AnotherSecurePassword456!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        ip: "192.168.1.101",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(secondModerator);

  // Step 4: Retrieve the password reset record using the second moderator's authentication
  const retrievedReset: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.moderator.passwordResets.at(
      connection,
      {
        resetId: passwordResetRequest.id,
      },
    );
  typia.assert(retrievedReset);

  // Step 5: Validate all fields in the retrieved password reset record
  TestValidator.equals(
    "retrieved reset ID matches created reset ID",
    retrievedReset.id,
    passwordResetRequest.id,
  );

  TestValidator.equals(
    "actor_type is moderator",
    retrievedReset.actor_type,
    "moderator",
  );

  TestValidator.equals(
    "email matches first moderator's email",
    retrievedReset.email,
    firstModeratorEmail,
  );

  TestValidator.predicate(
    "expiration timestamp is set",
    retrievedReset.expires_at !== null &&
      retrievedReset.expires_at !== undefined,
  );

  TestValidator.predicate(
    "creation timestamp is set",
    retrievedReset.created_at !== null &&
      retrievedReset.created_at !== undefined,
  );

  TestValidator.equals(
    "used_at is null (token not consumed)",
    retrievedReset.used_at,
    null,
  );

  TestValidator.predicate(
    "token field exists in response",
    typeof retrievedReset.token === "string" && retrievedReset.token.length > 0,
  );

  // Validate that expiration is approximately 1 hour from creation (within 5 minute tolerance)
  const createdDate = new Date(retrievedReset.created_at);
  const expiresDate = new Date(retrievedReset.expires_at);
  const hourInMs = 60 * 60 * 1000;
  const toleranceMs = 5 * 60 * 1000;
  const timeDiff = expiresDate.getTime() - createdDate.getTime();

  TestValidator.predicate(
    "expiration is approximately 1 hour from creation",
    Math.abs(timeDiff - hourInMs) < toleranceMs,
  );
}
