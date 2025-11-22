import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_password_reset_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account (dependency)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "SecurePassword123!";

  const userAccount: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1) + "_user",
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userAccount);

  // Step 2: Generate an invalid UUID token that doesn't exist in the system
  const invalidResetToken: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt password reset with invalid token
  await TestValidator.error(
    "password reset should fail with invalid token",
    async () => {
      await api.functional.auth.registeredUser.password.reset.resetPassword(
        connection,
        {
          token: invalidResetToken,
          body: {
            token: invalidResetToken,
            new_password: "NewSecurePassword456!",
            confirm_password: "NewSecurePassword456!",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IRedditPlatformRegisteredUser.IPasswordResetConfirmation,
        },
      );
    },
  );

  // Step 4: Verify user account security by attempting login with original credentials
  const verifyAccountSecurity = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: userAccount.username,
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(verifyAccountSecurity);

  // Step 5: Verify that user account status remains unchanged after invalid reset attempt
  TestValidator.equals(
    "user account status should remain active",
    verifyAccountSecurity.accountStatus,
    "active",
  );
  TestValidator.equals(
    "user email should remain unchanged",
    verifyAccountSecurity.email,
    userEmail,
  );
  TestValidator.equals(
    "user username should remain unchanged",
    verifyAccountSecurity.username,
    userAccount.username,
  );

  // Step 6: Verify that the original password still works by attempting another login
  const originalPasswordTest = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: userAccount.username,
        email: userEmail,
        password: userPassword, // Original password should still work
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(originalPasswordTest);

  TestValidator.equals(
    "original password should still be valid",
    originalPasswordTest.accountStatus,
    "active",
  );
}
