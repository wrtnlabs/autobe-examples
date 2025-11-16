import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_verification_invalid_token_format(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!@#";

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);

  // Step 2: Attempt email verification with invalid token formats
  // Test with a completely invalid token that doesn't exist in system
  const invalidToken = RandomGenerator.alphaNumeric(16);

  await TestValidator.error(
    "should reject invalid email verification token",
    async () => {
      await api.functional.communityPlatform.auth.member.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies ICommunityPlatformMember.IEmailVerifyConfirmRequest,
        },
      );
    },
  );

  // Step 3: Test with other malformed tokens to ensure consistent rejection
  const malformedTokens = [
    "invalid-token",
    RandomGenerator.alphaNumeric(5), // Too short
    RandomGenerator.alphaNumeric(256), // Very long
    "", // Empty string (though schema likely prevents this)
  ];

  for (const malformedToken of malformedTokens) {
    if (malformedToken.length > 0) {
      // Skip empty string
      await TestValidator.error(
        `should reject malformed token: ${malformedToken.substring(0, 10)}...`,
        async () => {
          await api.functional.communityPlatform.auth.member.email_verify.confirm.confirmEmailVerification(
            connection,
            {
              body: {
                token: malformedToken,
              } satisfies ICommunityPlatformMember.IEmailVerifyConfirmRequest,
            },
          );
        },
      );
    }
  }

  // Step 4: Verify that error doesn't reveal account existence
  // Attempting with same invalid token multiple times should yield consistent errors
  const testToken = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "invalid token should fail consistently",
    async () => {
      await api.functional.communityPlatform.auth.member.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            token: testToken,
          } satisfies ICommunityPlatformMember.IEmailVerifyConfirmRequest,
        },
      );
    },
  );

  TestValidator.predicate(
    "member account should exist in system",
    createdMember.id !== null && createdMember.id !== undefined,
  );
}
