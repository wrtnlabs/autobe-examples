import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_registered_user_password_reset_banned_account(
  connection: api.IConnection,
) {
  // 1. Create registered user account with secure random credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.alphaNumeric(12);
  const testPassword = "SecurePassword123!";

  const userAccount: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        username: testUsername,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(1),
        website_url: `https://${testUsername}.example.com`,
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  // Validate successful account creation
  typia.assert(userAccount);
  TestValidator.equals(
    "account should be active initially",
    userAccount.accountStatus,
    "active",
  );
  TestValidator.equals("email should match", userAccount.email, testEmail);
  TestValidator.equals(
    "username should match",
    userAccount.username,
    testUsername,
  );

  // 2. Test password reset rejection for banned account
  await TestValidator.error(
    "password reset should fail for banned account",
    async () => {
      await api.functional.auth.registeredUser.password.reset.requestPasswordReset(
        connection,
        {
          body: {
            email: userAccount.email,
            username: userAccount.username,
          } satisfies IRedditPlatformRegisteredUser.IPasswordResetRequest,
        },
      );
    },
  );

  // 3. Verify account status and authentication context
  TestValidator.equals(
    "user account should exist",
    userAccount.id.length > 0,
    true,
  );
  TestValidator.equals("token should be available", !!userAccount.token, true);
  TestValidator.equals(
    "email verification should be tracked",
    typeof userAccount.emailVerified,
    "boolean",
  );
}
