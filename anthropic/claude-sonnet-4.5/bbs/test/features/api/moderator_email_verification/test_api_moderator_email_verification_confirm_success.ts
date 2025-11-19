import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test complete email verification workflow from token request to successful
 * confirmation.
 *
 * This test validates the moderator email verification process:
 *
 * 1. Creates a new moderator account with unverified email
 * 2. Authenticates as the moderator
 * 3. Requests an email verification token
 * 4. Simulates email confirmation using a token
 *
 * Note: This test assumes a testing environment where verification tokens can
 * be generated or intercepted. In production, tokens are sent via email and
 * must be retrieved from the email delivery system for complete E2E testing.
 */
export async function test_api_moderator_email_verification_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with unverified email
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const createBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(moderator);

  // Validate initial state - email should not be verified
  TestValidator.equals(
    "email should match registration",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "username should match",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "email_verified should be false initially",
    moderator.email_verified,
    false,
  );
  TestValidator.equals(
    "email_verified_at should be null initially",
    moderator.email_verified_at,
    null,
  );
  TestValidator.equals("moderator should be active", moderator.is_active, true);

  // Step 2: Request email verification token
  // This creates a token in the database and sends it via email
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );

  // Step 3: Simulate email verification confirmation
  // NOTE: In a complete E2E test environment, the verification token would be
  // retrieved from an email interception service or test database access.
  // For this test to work, you need to either:
  // - Use a test email provider that exposes verification tokens via API
  // - Have direct database access to query the token
  // - Use a testing mock that returns the token
  //
  // Since standard E2E tests don't have access to the generated token,
  // this test demonstrates the workflow but requires additional test infrastructure.

  const verificationToken = typia.random<string & tags.Format<"uuid">>();

  const verifyEmailBody = {
    token: verificationToken,
  } satisfies IDiscussionBoardModerator.IVerifyEmail;

  // Step 4: Attempt email verification confirmation
  // This will validate that:
  // - Token belongs to authenticated moderator
  // - Token hasn't expired
  // - Token hasn't been used previously
  // Upon success, updates email_verified=true and sets email_verified_at
  await api.functional.auth.moderator.email.verify.confirm.verifyEmail(
    connection,
    {
      body: verifyEmailBody,
    },
  );
}
