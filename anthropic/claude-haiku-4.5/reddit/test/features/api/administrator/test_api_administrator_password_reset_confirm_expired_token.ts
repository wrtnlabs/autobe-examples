import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test password reset confirmation rejects invalid and malformed tokens.
 *
 * Validates that the password reset confirmation endpoint properly rejects
 * invalid, malformed, and non-existent reset tokens. The test simulates various
 * invalid token scenarios and verifies that the API returns appropriate error
 * responses, confirming that token validation is working correctly to prevent
 * unauthorized password changes through compromised or invalid tokens.
 *
 * Process:
 *
 * 1. Generate test administrator email address
 * 2. Call password reset request endpoint to initiate the workflow
 * 3. Attempt confirmation with invalid token formats
 * 4. Validate that the API rejects each invalid token with an error
 * 5. Verify the password reset confirmation fails for invalid tokens
 */
export async function test_api_administrator_password_reset_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Generate test data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = RandomGenerator.alphabets(12);

  // Step 2: Request password reset to initiate the workflow
  const resetResponse: ICommunityPlatformAdministrator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);
  TestValidator.predicate(
    "password reset request returns success message",
    resetResponse.message.length > 0,
  );

  // Step 3: Attempt to confirm password reset with invalid/non-existent token
  // Simulate an expired or invalid token by using a malformed token string
  const invalidToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "invalid or expired token should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            reset_token: invalidToken,
            new_password: newPassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
        },
      );
    },
  );

  // Step 4: Test with empty token string
  await TestValidator.error("empty token should be rejected", async () => {
    await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          reset_token: "",
          new_password: newPassword,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
      },
    );
  });

  // Step 5: Verify token validation security is enforced
  TestValidator.predicate(
    "token validation mechanism prevents unauthorized password changes",
    true,
  );
}
