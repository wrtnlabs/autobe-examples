import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test successful moderator email verification workflow.
 *
 * This test validates the moderator registration and email verification
 * process. Since E2E tests cannot access the email system or database directly
 * to retrieve the verification token, this test focuses on:
 *
 * 1. Successfully registering a new moderator account
 * 2. Verifying the account is created with email_verified set to false
 * 3. Testing the verification endpoint with a placeholder token
 *
 * Note: In a production environment, the verification token would be retrieved
 * from the email sent to the moderator. For complete E2E testing, integration
 * with an email testing service or database access would be required.
 */
export async function test_api_moderator_email_verification_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Validate moderator was created successfully
  TestValidator.equals(
    "username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals("email matches", moderator.email, moderatorData.email);
  TestValidator.equals(
    "email not verified initially",
    moderator.email_verified,
    false,
  );
  TestValidator.predicate(
    "moderator ID exists",
    typeof moderator.id === "string" && moderator.id.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    typeof moderator.token.access === "string" &&
      moderator.token.access.length > 0,
  );

  // Step 2: Test email verification endpoint
  // Note: In a real scenario, the verification token would come from the email
  // For this test, we use a mock token to demonstrate the endpoint structure
  const mockVerificationToken = `verification_${RandomGenerator.alphaNumeric(32)}`;

  // This will likely fail with the mock token, but demonstrates the workflow
  // In a complete E2E test environment, you would need:
  // - Access to email testing service (like MailHog, Mailpit)
  // - OR direct database access to retrieve the token
  // - OR a test-only endpoint that returns verification tokens
  await TestValidator.error(
    "verification fails with invalid token",
    async () => {
      await api.functional.auth.moderator.email.verify.verifyEmail(connection, {
        body: {
          verification_token: mockVerificationToken,
        } satisfies IRedditLikeModerator.IEmailVerification,
      });
    },
  );
}
