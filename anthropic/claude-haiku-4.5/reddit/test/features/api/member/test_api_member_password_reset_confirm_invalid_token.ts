import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset confirmation with an invalid or non-existent reset token.
 *
 * This test validates that the password reset endpoint properly rejects
 * requests when an invalid or non-existent reset token is provided. The system
 * must verify that the token exists, is not expired, and corresponds to a valid
 * password reset request before allowing the password change to proceed.
 *
 * Test scenarios:
 *
 * 1. Attempt password reset with a completely invalid token format
 * 2. Attempt password reset with a valid token format but non-existent token
 * 3. Verify that proper error response is returned indicating token invalidity
 *
 * This ensures security by preventing unauthorized password changes and
 * verifying that only legitimate reset tokens from valid password reset
 * requests can be used.
 */
export async function test_api_member_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Test Case 1: Attempt password reset with an invalid token
  // This tests the core security requirement that invalid tokens are rejected
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: "invalid-token-12345",
          password: "ValidPassword123!",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test Case 2: Attempt password reset with a non-existent UUID token
  // Valid UUID format but token does not exist in the system
  await TestValidator.error(
    "non-existent token UUID should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: typia.random<string & tags.Format<"uuid">>(),
            password: "ValidPassword123!",
          } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
        },
      );
    },
  );

  // Test Case 3: Attempt password reset with an empty token
  // Verify that empty strings are also properly rejected
  await TestValidator.error("empty token should be rejected", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: "",
          password: "ValidPassword123!",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });
}
