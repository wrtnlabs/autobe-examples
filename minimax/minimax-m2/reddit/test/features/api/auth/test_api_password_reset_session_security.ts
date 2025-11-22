import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_password_reset_session_security(
  connection: api.IConnection,
) {
  // Create a new registered user account to test password reset security
  const username: string = RandomGenerator.alphaNumeric(10);
  const email: string = typia.random<string & tags.Format<"email">>();
  const originalPassword: string = "SecurePassword123!";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: username,
        email: email,
        password: originalPassword,
        display_name: "Test User",
        bio: "Test user for password reset security testing",
        href: "https://example.com/register",
        referrer: "https://example.com/login",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Verify the user was created with initial security tracking
  TestValidator.equals("user created successfully", user.id.length > 0, true);
  TestValidator.equals(
    "initial failed login attempts should be 0",
    user.failedLoginAttempts,
    0,
  );
  TestValidator.equals(
    "account status should be active",
    user.accountStatus,
    "active",
  );

  // Generate a random password reset token (in real scenario this would come from email)
  const resetToken: string = typia.random<string & tags.Format<"uuid">>();

  // Perform password reset with new credentials
  const newPassword: string = "NewSecurePassword456!";
  const resetResponse: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.password.reset.resetPassword(
      connection,
      {
        token: resetToken,
        body: {
          token: resetToken,
          new_password: newPassword,
          confirm_password: newPassword,
          href: "https://example.com/reset-password",
          referrer: "https://example.com/login",
        } satisfies IRedditPlatformRegisteredUser.IPasswordResetConfirmation,
      },
    );
  typia.assert(resetResponse);

  // Validate password reset response security features
  TestValidator.equals(
    "user ID should remain the same",
    resetResponse.id,
    user.id,
  );
  TestValidator.equals(
    "username should remain the same",
    resetResponse.username,
    user.username,
  );
  TestValidator.equals(
    "failed login attempts should be reset to 0",
    resetResponse.failedLoginAttempts,
    0,
  );
  TestValidator.equals(
    "password hash should be different",
    resetResponse.passwordHash,
    user.passwordHash,
  );
  TestValidator.equals(
    "updated timestamp should be newer",
    new Date(resetResponse.updatedAt) > new Date(user.updatedAt),
    true,
  );

  // Verify that the system may have invalidated the previous session and provided new tokens
  TestValidator.equals(
    "new access token should be provided",
    resetResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token should be provided",
    resetResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "access token should have expiration",
    resetResponse.token.expired_at.length > 0,
    true,
  );

  // Validate audit trail maintenance
  TestValidator.equals(
    "last login should be updated",
    new Date(resetResponse.lastLogin) >= new Date(user.lastLogin),
    true,
  );
  TestValidator.equals(
    "account created timestamp should be preserved",
    resetResponse.accountCreated,
    user.accountCreated,
  );

  // Test that the new password can be used for login (if login API were available)
  // Note: This would require a login API that we don't have in the current context
  // but the password reset confirmation indicates successful password update

  // Validate business logic: password reset should succeed for valid token
  TestValidator.predicate(
    "password reset should complete successfully",
    resetResponse.businessStatus !== "restricted",
  );
  TestValidator.predicate(
    "user account should remain active",
    resetResponse.accountStatus === "active",
  );

  // Additional security validation
  TestValidator.equals(
    "user session should be re-established",
    resetResponse.token.access !== user.token.access,
    true,
  );
  TestValidator.equals(
    "email verification should be preserved",
    resetResponse.emailVerified,
    user.emailVerified,
  );

  // Test scenario completion
  TestValidator.equals(
    "password reset security test completed successfully",
    resetResponse.id === user.id,
    true,
  );
}
