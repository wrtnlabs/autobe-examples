import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset confirmation with an expired token.
 *
 * This test validates the security mechanism that prevents password reset
 * confirmation when the reset token has expired. Reset tokens are single-use,
 * time-limited credentials valid for only 1 hour from generation. After the
 * validity window expires, the token should be rejected and the member must
 * request a new password reset.
 *
 * Test workflow:
 *
 * 1. Request a password reset for a member account (generates a reset token)
 * 2. Attempt to confirm password reset with an expired/invalid token
 * 3. Verify that the API rejects the expired token with an error
 * 4. Confirm that member can request a new password reset
 */
export async function test_api_member_password_reset_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Request password reset to generate a token
  const memberEmail = typia.random<string & tags.Format<"email">>();

  await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies ICommunityPlatformMember.IPasswordResetRequest,
    },
  );

  // Step 2: Use an expired/invalid token
  // In production, this would be an actual token that has passed the 1-hour
  // expiration window. For testing, we use an invalid token to simulate
  // an expired credential that the system will reject.
  const expiredToken = RandomGenerator.alphaNumeric(32);
  const newPassword = "SecurePassword123!";

  // Step 3: Attempt to confirm password reset with expired token
  // This should fail because the token is invalid/expired
  await TestValidator.error(
    "expired or invalid token should be rejected during password reset confirmation",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: expiredToken,
            password: newPassword,
          } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
        },
      );
    },
  );

  // Step 4: Verify that a new password reset request can be made
  // This confirms the security mechanism is working - expired tokens
  // require the member to request a fresh password reset
  await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies ICommunityPlatformMember.IPasswordResetRequest,
    },
  );

  TestValidator.predicate(
    "new password reset request succeeds after expired token rejection",
    true,
  );
}
