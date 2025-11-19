import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password reset completion with an invalid token to simulate expired
 * token rejection.
 *
 * This test validates that the password reset system properly rejects invalid
 * tokens. While we cannot truly test token expiration (which would require time
 * manipulation or waiting 1 hour), we can verify that the system rejects tokens
 * that don't exist in the database, which simulates the same error path as
 * expired token handling.
 *
 * Test workflow:
 *
 * 1. Create a new member account
 * 2. Request password reset to verify the reset flow is working
 * 3. Attempt password reset with an invalid/non-existent token
 * 4. Verify the operation is rejected with an error
 *
 * Note: True expiration testing would require either:
 *
 * - Server-side time manipulation capabilities
 * - Waiting for the actual 60-minute expiration period
 * - Test-specific endpoints that can create pre-expired tokens
 */
export async function test_api_password_reset_completion_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePassword123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: originalPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Request password reset to generate a valid token (verify the flow works)
  const resetRequest =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest);

  // Verify the reset request was successful with expected expiration
  TestValidator.equals(
    "password reset request expires in 60 minutes",
    resetRequest.expires_in_minutes,
    60,
  );

  // Step 3: Attempt to complete password reset with an invalid token
  // This simulates the expired token scenario - both expired and invalid tokens
  // should be rejected by the system with similar error handling
  const invalidToken = "invalid-token-" + RandomGenerator.alphaNumeric(32);
  const newPassword = "NewSecurePassword456!";

  await TestValidator.error(
    "password reset completion should fail with invalid token",
    async () => {
      await api.functional.auth.member.password.reset.complete.resetPassword(
        connection,
        {
          body: {
            token: invalidToken,
            password: newPassword,
          } satisfies IDiscussionBoardMember.IResetPassword,
        },
      );
    },
  );
}
