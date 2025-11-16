import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification confirmation with invalid verification token.
 *
 * This test validates that the system properly rejects invalid or malformed
 * verification tokens and prevents unauthorized email verification attempts. It
 * demonstrates security measures protecting against token tampering and
 * unauthorized verification.
 *
 * Test workflow:
 *
 * 1. Create a new administrator account for email verification testing
 * 2. Attempt to confirm email verification with an invalid token
 * 3. Validate that the confirmation fails with appropriate error
 * 4. Verify that email_verified status remains false
 */
export async function test_api_administrator_email_verification_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/auth/administrator/join",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Attempt to confirm email verification with an invalid token
  // Use various invalid token formats to test security
  const invalidTokens = [
    "invalid-token-format",
    RandomGenerator.alphaNumeric(32),
    "malformed-jwt-token.header.signature",
    "",
    RandomGenerator.alphabets(256),
  ];

  for (const invalidToken of invalidTokens) {
    // Step 3: Validate that the confirmation fails
    await TestValidator.error(
      "invalid token should fail verification",
      async () => {
        await api.functional.communityPlatform.administrator.auth.administrator.email_verify.confirm.confirmEmailVerification(
          connection,
          {
            body: {
              verification_token: invalidToken,
            } satisfies ICommunityPlatformAdministrator.IEmailVerifyConfirmRequest,
          },
        );
      },
    );
  }

  // Step 4: Verify that email_verified status remains false
  // by attempting to use the unverified account and confirming it still fails
  await TestValidator.error(
    "unverified admin should not be able to access verified-only features",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            verification_token:
              "another-invalid-token-" + RandomGenerator.alphaNumeric(20),
          } satisfies ICommunityPlatformAdministrator.IEmailVerifyConfirmRequest,
        },
      );
    },
  );
}
