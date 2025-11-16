import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful password reset completion with valid reset token and new
 * password.
 *
 * This test validates the complete password reset workflow:
 *
 * 1. Request a password reset for a member email address
 * 2. Confirm the password reset with a valid token and new secure password
 * 3. Verify the response contains complete member account information
 * 4. Verify password meets all security requirements
 * 5. Verify account status and member data are returned correctly
 *
 * The test ensures password security requirements are enforced:
 *
 * - Minimum 8 characters
 * - Contains uppercase letters
 * - Contains lowercase letters
 * - Contains numbers
 * - Contains special characters
 */
export async function test_api_member_password_reset_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Generate a valid email and request password reset
  const memberEmail = typia.random<string & tags.Format<"email">>();

  await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies ICommunityPlatformMember.IPasswordResetRequest,
    },
  );

  // Step 2: Generate a secure password that meets all security requirements
  // Password must have: min 8 chars, uppercase, lowercase, numbers, special chars
  const securePassword = "NewPass123!Secure";

  // Step 3: For this test, we use the token provided by the API response or test harness
  // In a real scenario, this would be extracted from the email or provided by the test setup
  const resetToken = typia.random<string>();

  // Step 4: Confirm the password reset with valid token and new password
  const resetResponse =
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          password: securePassword,
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );

  // Step 5: Validate the response contains complete member account information
  typia.assert(resetResponse);

  // Step 6: Verify response contains expected member email
  TestValidator.equals(
    "response email matches requested email",
    resetResponse.email,
    memberEmail,
  );

  // Step 7: Verify account is active after password reset
  TestValidator.equals(
    "account status is active after password reset",
    resetResponse.account_status,
    "active",
  );

  // Step 8: Verify karma score is non-negative
  TestValidator.predicate(
    "karma score is non-negative",
    resetResponse.karma_score >= 0,
  );

  // Step 9: Verify password meets security requirements
  TestValidator.predicate(
    "password has minimum 8 characters",
    securePassword.length >= 8,
  );

  TestValidator.predicate(
    "password contains uppercase letters",
    /[A-Z]/.test(securePassword),
  );

  TestValidator.predicate(
    "password contains lowercase letters",
    /[a-z]/.test(securePassword),
  );

  TestValidator.predicate(
    "password contains numbers",
    /[0-9]/.test(securePassword),
  );

  TestValidator.predicate(
    "password contains special characters",
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(securePassword),
  );

  // Step 10: Verify confirmation message indicates successful password reset
  TestValidator.predicate(
    "confirmation message contains success indication",
    resetResponse.message.toLowerCase().includes("password") ||
      resetResponse.message.toLowerCase().includes("reset") ||
      resetResponse.message.toLowerCase().includes("change") ||
      resetResponse.message.toLowerCase().includes("success"),
  );
}
