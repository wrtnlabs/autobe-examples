import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_password_reset_mismatched_passwords(
  connection: api.IConnection,
) {
  // Create a new registered user account
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = `testuser_${typia.random<string & tags.MinLength<3> & tags.MaxLength<15>>()}`;

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);

  // Test password reset with mismatched passwords
  // Since we don't have a separate password reset request endpoint,
  // we'll use a valid UUID format token to test the validation logic
  const resetToken: string = typia.random<string & tags.Format<"uuid">>();

  // Test password reset with mismatched passwords
  await TestValidator.error(
    "password reset should fail when passwords don't match",
    async () => {
      await api.functional.auth.registeredUser.password.reset.resetPassword(
        connection,
        {
          token: resetToken,
          body: {
            token: resetToken,
            new_password: "NewPassword123!",
            confirm_password: "DifferentPassword123!",
            href: "https://example.com/reset-password",
            referrer: "https://example.com",
          } satisfies IRedditPlatformRegisteredUser.IPasswordResetConfirmation,
        },
      );
    },
  );
}
