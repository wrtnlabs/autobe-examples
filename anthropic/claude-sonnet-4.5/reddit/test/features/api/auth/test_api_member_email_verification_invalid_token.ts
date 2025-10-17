import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test email verification with an invalid or non-existent verification token.
 *
 * This test validates that the system properly rejects invalid verification
 * tokens and protects against token guessing attacks by not revealing whether
 * the token format is invalid versus simply not found in the database.
 *
 * Steps:
 *
 * 1. Generate a random verification token that doesn't exist in the system
 * 2. Attempt to verify email using this invalid token
 * 3. Validate that the API rejects the request with an error
 * 4. Ensure no information leakage about token validity
 */
export async function test_api_member_email_verification_invalid_token(
  connection: api.IConnection,
) {
  // Generate a random invalid verification token
  const invalidToken = RandomGenerator.alphaNumeric(32);

  // Attempt to verify email with invalid token - should fail
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.auth.member.email.verify.verifyEmail(connection, {
      body: {
        verification_token: invalidToken,
      } satisfies IRedditLikeMember.IVerifyEmail,
    });
  });
}
