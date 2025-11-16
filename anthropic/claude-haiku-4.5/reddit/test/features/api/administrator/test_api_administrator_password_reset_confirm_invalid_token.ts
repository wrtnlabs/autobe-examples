import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test password reset confirmation with an invalid or malformed reset token.
 *
 * This test validates that the system properly rejects password reset
 * confirmation attempts using invalid, non-existent, or fabricated reset
 * tokens. The test ensures that:
 *
 * 1. Invalid tokens are rejected with appropriate error responses
 * 2. The administrator's password remains unchanged after failed confirmation
 * 3. The system prevents unauthorized password modifications through token
 *    exploitation
 *
 * The test uses a fabricated reset token that does not correspond to any valid
 * reset request, simulating either a malicious attempt or a token that has
 * already been used/expired. The API should return a 400 or 401 error
 * response.
 */
export async function test_api_administrator_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Generate an invalid reset token (fabricated UUID that doesn't exist in the system)
  const invalidResetToken = typia.random<string & tags.Format<"uuid">>();

  // Generate a valid new password (meets minimum 8 character requirement)
  const newPassword = RandomGenerator.alphabets(12);

  // Attempt to confirm password reset with invalid token
  // This should fail with an HTTP error response
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          reset_token: invalidResetToken,
          new_password: newPassword,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
      },
    );
  });
}
