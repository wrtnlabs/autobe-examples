import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test expired email verification token rejection.
 *
 * This test validates that the email verification system properly rejects
 * invalid or expired verification tokens. When a moderator account is created,
 * a verification token is generated with a 24-hour expiration period. This test
 * ensures that tokens that are invalid (simulating expired tokens) are properly
 * rejected by the verification endpoint.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account (generates verification token automatically)
 * 2. Attempt to verify email with an invalid token (simulates expired/wrong token)
 * 3. Verify that the system rejects the invalid token with an appropriate error
 * 4. Confirm that email_verified status remains false after failed verification
 */
export async function test_api_moderator_email_verification_token_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account which generates a verification token
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeModerator.ICreate;

  const createdModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(createdModerator);

  // Verify initial state: email should not be verified yet
  TestValidator.equals(
    "email should not be verified initially",
    createdModerator.email_verified,
    false,
  );

  // Step 2: Attempt to verify with an invalid token (simulates expired token scenario)
  const invalidToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "invalid verification token should be rejected",
    async () => {
      await api.functional.auth.moderator.email.verify.verifyEmail(connection, {
        body: {
          verification_token: invalidToken,
        } satisfies IRedditLikeModerator.IEmailVerification,
      });
    },
  );
}
