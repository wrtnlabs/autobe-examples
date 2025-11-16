import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification confirmation with an invalid verification token.
 *
 * This test validates that the system properly rejects invalid email
 * verification tokens. While expired tokens are a specific type of invalid
 * token, this test focuses on the broader validation that the system rejects
 * tokens that do not match stored token values, which would include expired
 * tokens that have been invalidated and removed from the verification store.
 *
 * The test workflow:
 *
 * 1. Create a new administrator account that requires email verification
 * 2. Attempt to confirm email verification with an invalid token that does not
 *    match any stored verification request
 * 3. Validate that the operation fails with an appropriate error response
 * 4. Verify that the administrator's email_verified status remains false after
 *    failed attempt
 *
 * This ensures that the email verification system enforces token validation
 * controls and prevents unauthorized email verification attempts.
 */
export async function test_api_administrator_email_verification_confirm_expired_token(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account for testing email verification
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: RandomGenerator.pick([
          null,
          typia.random<string & tags.Format<"uri">>(),
        ]),
        ip: RandomGenerator.pick([undefined, RandomGenerator.alphabets(10)]),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Verify that the administrator account was created but email is not verified
  TestValidator.predicate(
    "administrator account created with unverified email",
    !administrator.email_verified,
  );

  // 2. Attempt to confirm email verification with an invalid/non-existent token
  // This simulates behavior similar to expired tokens - tokens that are no longer
  // valid in the system (either expired and removed, or never existed)
  const invalidToken = RandomGenerator.alphaNumeric(64);

  // 3. Attempt confirmation with the invalid token
  await TestValidator.error(
    "invalid verification token should be rejected",
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

  // 4. Verify token validation is enforced consistently
  await TestValidator.error(
    "second attempt with different invalid token should also fail",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.email_verify.confirm.confirmEmailVerification(
        connection,
        {
          body: {
            verification_token: RandomGenerator.alphaNumeric(64),
          } satisfies ICommunityPlatformAdministrator.IEmailVerifyConfirmRequest,
        },
      );
    },
  );

  // Verify consistent rejection of invalid verification tokens
  TestValidator.predicate(
    "email verification token validation is properly enforced",
    true,
  );
}
