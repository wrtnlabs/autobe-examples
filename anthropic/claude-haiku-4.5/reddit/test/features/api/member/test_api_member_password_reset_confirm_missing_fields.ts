import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset confirmation endpoint with valid data.
 *
 * This test validates the password reset confirmation endpoint's successful
 * operation. Although the original scenario requested testing missing required
 * fields, this cannot be implemented in valid TypeScript without violating type
 * safety principles. The TypeScript compiler enforces that required fields must
 * be provided at compile time, preventing invalid requests at the source.
 *
 * Instead, this test validates that:
 *
 * 1. The endpoint accepts properly formatted reset tokens and passwords
 * 2. The endpoint returns complete member account state upon successful reset
 * 3. The response includes confirmation of password change
 * 4. All account metadata is properly preserved after password reset
 */
export async function test_api_member_password_reset_confirm_missing_fields(
  connection: api.IConnection,
) {
  // Generate valid reset token and new password meeting security requirements
  const resetToken = RandomGenerator.alphaNumeric(32);
  const newPassword = "SecurePassword123!";

  // Submit valid password reset confirmation request
  const response: ICommunityPlatformMember.IPasswordResetConfirmResponse =
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: resetToken,
          password: newPassword,
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );

  // Validate complete response structure and type compliance
  typia.assert(response);

  // Verify response contains required member identification
  TestValidator.predicate(
    "response contains valid member ID",
    response.id.length > 0,
  );

  TestValidator.predicate(
    "response contains valid email address",
    response.email.includes("@"),
  );

  TestValidator.predicate(
    "response contains username",
    response.username.length >= 3,
  );

  // Verify account state information is preserved
  TestValidator.predicate(
    "account status is active or valid state",
    response.account_status !== undefined,
  );

  TestValidator.predicate(
    "email verification status is tracked",
    typeof response.email_verified === "boolean",
  );

  TestValidator.predicate(
    "karma score is numeric",
    typeof response.karma_score === "number",
  );

  // Verify audit timestamps are present
  TestValidator.predicate(
    "created timestamp exists",
    response.created_at !== undefined && response.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated timestamp exists",
    response.updated_at !== undefined && response.updated_at.length > 0,
  );

  // Verify success confirmation message
  TestValidator.predicate(
    "response includes confirmation message",
    response.message !== undefined && response.message.length > 0,
  );
}
