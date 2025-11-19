import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test the password reset request workflow for a moderator account.
 *
 * This test validates the polymorphic password reset system's ability to handle
 * moderator account password resets through the Compatible Actor Pattern. It
 * creates a new moderator account, submits a password reset request with
 * actor_type='moderator', and verifies the system generates proper reset
 * records with the moderator discriminator.
 *
 * Steps:
 *
 * 1. Create a new moderator account using the moderator join endpoint
 * 2. Submit a password reset request for the moderator's email with
 *    actor_type='moderator'
 * 3. Validate the response contains correct actor_type value ('moderator')
 * 4. Verify the email address matches the moderator's registered email
 * 5. Check that all required metadata fields are present and valid
 * 6. Ensure the expiration timestamp is set correctly (1 hour from creation)
 * 7. Confirm used_at is null (token not yet used)
 */
export async function test_api_password_reset_moderator_account_request(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureMod123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/admin",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Submit password reset request for moderator account
  const passwordReset: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.passwordResets.create(connection, {
      body: {
        actor_type: "moderator",
        email: moderatorEmail,
      } satisfies IDiscussionBoardPasswordReset.ICreate,
    });
  typia.assert(passwordReset);

  // Step 3: Validate actor_type is 'moderator'
  TestValidator.equals(
    "actor_type should be moderator",
    passwordReset.actor_type,
    "moderator",
  );

  // Step 4: Verify email matches moderator's registered email
  TestValidator.equals(
    "email should match moderator email",
    passwordReset.email,
    moderatorEmail,
  );

  // Step 5: Verify expiration timestamp is in the future (within 1 hour)
  const expiresAt = new Date(passwordReset.expires_at);
  const createdAt = new Date(passwordReset.created_at);
  const now = new Date();

  TestValidator.predicate(
    "expires_at should be after created_at",
    expiresAt > createdAt,
  );

  TestValidator.predicate(
    "expires_at should be in the future",
    expiresAt > now,
  );

  // Verify expiration is approximately 1 hour from creation (allow 5 second variance)
  const hourInMs = 60 * 60 * 1000;
  const expirationDuration = expiresAt.getTime() - createdAt.getTime();
  TestValidator.predicate(
    "expiration should be approximately 1 hour from creation",
    Math.abs(expirationDuration - hourInMs) < 5000,
  );

  // Step 6: Confirm used_at is null (token not yet used)
  TestValidator.equals(
    "used_at should be null for new reset token",
    passwordReset.used_at,
    null,
  );
}
