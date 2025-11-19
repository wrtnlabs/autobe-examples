import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password reset completion with invalid tokens.
 *
 * This test validates the security behavior when attempting to complete
 * password reset with non-existent or invalid tokens. The endpoint should
 * reject all invalid token attempts without revealing information about token
 * existence or status.
 *
 * Test scenarios:
 *
 * 1. Completely random token string (non-existent)
 * 2. Another random token (testing consistency)
 * 3. Empty-like token value
 *
 * All attempts should fail with appropriate errors, ensuring the system
 * maintains security by not processing invalid tokens.
 */
export async function test_api_password_reset_completion_invalid_token(
  connection: api.IConnection,
) {
  // Test scenario 1: Completely random non-existent token
  const randomToken1 = RandomGenerator.alphaNumeric(64);
  const randomPassword1 = RandomGenerator.alphaNumeric(16);

  await TestValidator.error(
    "should reject non-existent random token",
    async () => {
      await api.functional.auth.member.password.reset.complete.resetPassword(
        connection,
        {
          body: {
            token: randomToken1,
            password: randomPassword1,
          } satisfies IDiscussionBoardMember.IResetPassword,
        },
      );
    },
  );

  // Test scenario 2: Another random token to verify consistent behavior
  const randomToken2 = RandomGenerator.alphaNumeric(48);
  const randomPassword2 = RandomGenerator.alphaNumeric(20);

  await TestValidator.error(
    "should reject different non-existent token",
    async () => {
      await api.functional.auth.member.password.reset.complete.resetPassword(
        connection,
        {
          body: {
            token: randomToken2,
            password: randomPassword2,
          } satisfies IDiscussionBoardMember.IResetPassword,
        },
      );
    },
  );

  // Test scenario 3: Short invalid token
  const shortInvalidToken = RandomGenerator.alphabets(10);
  const randomPassword3 = RandomGenerator.alphaNumeric(12);

  await TestValidator.error("should reject short invalid token", async () => {
    await api.functional.auth.member.password.reset.complete.resetPassword(
      connection,
      {
        body: {
          token: shortInvalidToken,
          password: randomPassword3,
        } satisfies IDiscussionBoardMember.IResetPassword,
      },
    );
  });

  // Test scenario 4: Very long invalid token
  const longInvalidToken = RandomGenerator.alphaNumeric(128);
  const randomPassword4 = RandomGenerator.alphaNumeric(15);

  await TestValidator.error("should reject long invalid token", async () => {
    await api.functional.auth.member.password.reset.complete.resetPassword(
      connection,
      {
        body: {
          token: longInvalidToken,
          password: randomPassword4,
        } satisfies IDiscussionBoardMember.IResetPassword,
      },
    );
  });

  // Test scenario 5: UUID-like format but non-existent token
  const uuidLikeToken = typia.random<string & tags.Format<"uuid">>();
  const randomPassword5 = RandomGenerator.alphaNumeric(18);

  await TestValidator.error(
    "should reject UUID-format non-existent token",
    async () => {
      await api.functional.auth.member.password.reset.complete.resetPassword(
        connection,
        {
          body: {
            token: uuidLikeToken,
            password: randomPassword5,
          } satisfies IDiscussionBoardMember.IResetPassword,
        },
      );
    },
  );
}
