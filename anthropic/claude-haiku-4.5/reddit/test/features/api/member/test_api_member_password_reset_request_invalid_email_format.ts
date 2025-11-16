import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset request with invalid email formats to validate input
 * validation.
 *
 * Validates that the password reset request API properly rejects malformed
 * email addresses such as missing '@' symbol, invalid domain format, extra
 * spaces, empty string, and special characters that violate email format
 * standards. The operation should return appropriate validation error responses
 * for these invalid inputs.
 */
export async function test_api_member_password_reset_request_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Empty email string
  await TestValidator.error("empty email should be rejected", async () => {
    await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: "",
        } satisfies ICommunityPlatformMember.IPasswordResetRequest,
      },
    );
  });

  // Test 2: Email missing @ symbol
  await TestValidator.error(
    "email without @ symbol should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "invalidemail.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 3: Email with spaces
  await TestValidator.error(
    "email with spaces should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "invalid email@example.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 4: Email missing domain
  await TestValidator.error(
    "email missing domain extension should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "invalid@domain",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 5: Email with only @ symbol
  await TestValidator.error(
    "email with only @ symbol should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "@example.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 6: Email with invalid special characters
  await TestValidator.error(
    "email with invalid special characters should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "user##name@example.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 7: Email with multiple @ symbols
  await TestValidator.error(
    "email with multiple @ symbols should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "user@domain@example.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 8: Email starting with dot
  await TestValidator.error(
    "email starting with dot should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: ".user@example.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );

  // Test 9: Email with consecutive dots
  await TestValidator.error(
    "email with consecutive dots should be rejected",
    async () => {
      await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "user..name@example.com",
          } satisfies ICommunityPlatformMember.IPasswordResetRequest,
        },
      );
    },
  );
}
