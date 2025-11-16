import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset confirmation with weak passwords that fail security
 * requirements.
 *
 * The password reset endpoint enforces strict security constraints:
 *
 * - Minimum 8 characters length
 * - Must contain uppercase letters (A-Z)
 * - Must contain lowercase letters (a-z)
 * - Must contain numbers (0-9)
 * - Must contain special characters
 *
 * This test validates that various weak password scenarios are properly
 * rejected:
 *
 * 1. Password too short (less than 8 characters)
 * 2. All lowercase letters only
 * 3. All uppercase letters only
 * 4. Numbers only
 * 5. Missing uppercase letters
 * 6. Missing lowercase letters
 * 7. Missing numbers
 * 8. Missing special characters
 * 9. Only special characters
 *
 * Each weak password attempt should fail validation, confirming the backend
 * properly enforces password complexity requirements.
 */
export async function test_api_member_password_reset_confirm_weak_password(
  connection: api.IConnection,
) {
  const validToken = typia.random<string>();

  // Test 1: Password too short (less than 8 characters)
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "Short1!",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test 2: All lowercase letters only
  await TestValidator.error("all lowercase should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "alllowercase",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test 3: All uppercase letters only
  await TestValidator.error("all uppercase should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "ALLUPPERCASE",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test 4: Numbers only
  await TestValidator.error("numbers only should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "12345678",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test 5: Missing uppercase letters
  await TestValidator.error(
    "missing uppercase letters should fail",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: validToken,
            password: "lowercase123!",
          } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
        },
      );
    },
  );

  // Test 6: Missing lowercase letters
  await TestValidator.error(
    "missing lowercase letters should fail",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: validToken,
            password: "UPPERCASE123!",
          } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
        },
      );
    },
  );

  // Test 7: Missing numbers
  await TestValidator.error("missing numbers should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "Abc!defgh",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test 8: Missing special characters
  await TestValidator.error(
    "missing special characters should fail",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
        connection,
        {
          body: {
            token: validToken,
            password: "Abcdefgh123",
          } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
        },
      );
    },
  );

  // Test 9: Only special characters
  await TestValidator.error("only special characters should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "!@#$%^&*",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });

  // Test 10: Empty string
  await TestValidator.error("empty string should fail", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: validToken,
          password: "",
        } satisfies ICommunityPlatformCommunity.IPasswordResetConfirm.ICreate,
      },
    );
  });
}
