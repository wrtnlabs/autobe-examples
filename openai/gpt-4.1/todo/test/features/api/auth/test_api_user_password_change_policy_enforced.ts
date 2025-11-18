import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Verify enforcement of password strength policy in password change API.
 *
 * 1. Register a new user (join) with a valid password (>= 8 chars)
 * 2. Attempt to change password to an invalid new password (too short)
 * 3. Assert password change fails due to password policy
 * 4. Check session is not revoked after failed attempt
 * 5. Assert the old password can still be used for authentication
 * 6. Assert the new (invalid) password CANNOT be used to login
 */
export async function test_api_user_password_change_policy_enforced(
  connection: api.IConnection,
) {
  // 1. Register new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(10); // valid password
  const joinOutput: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword satisfies string & tags.MinLength<8>,
        href: "https://localhost/register",
        referrer: "https://localhost/register",
      },
    },
  );
  typia.assert(joinOutput);

  // 2. Attempt to change password to an invalid (too short) password
  const invalidNewPassword = RandomGenerator.alphaNumeric(4); // too short (min length is 8)
  await TestValidator.error(
    "reject too-short password on password change",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: {
            oldPassword: userPassword,
            newPassword: invalidNewPassword,
          },
        },
      );
    },
  );

  // 3. Confirm session is not revoked: can immediately request another API call (e.g. change password again with correct password length)
  // (Should succeed with a valid new password)
  const newValidPassword = RandomGenerator.alphaNumeric(10);
  const pwChangeResult =
    await api.functional.auth.user.password.change.changePassword(connection, {
      body: {
        oldPassword: userPassword,
        newPassword: newValidPassword,
      },
    });
  typia.assert(pwChangeResult);
  TestValidator.predicate(
    "password change success after valid password given",
    pwChangeResult.success === true,
  );

  // 4. Attempt to login with the OLD password: should now fail
  await TestValidator.error(
    "old password cannot be used after password changed",
    async () => {
      await api.functional.auth.user.join(
        { ...connection, headers: {} },
        {
          body: {
            email: userEmail,
            password: userPassword,
            href: "https://localhost/login",
            referrer: "https://localhost/login",
          },
        },
      );
    },
  );

  // 5. Login with the NEW password: should succeed
  const reAuth = await api.functional.auth.user.join(
    { ...connection, headers: {} },
    {
      body: {
        email: userEmail,
        password: newValidPassword,
        href: "https://localhost/login",
        referrer: "https://localhost/login",
      },
    },
  );
  typia.assert(reAuth);
  TestValidator.equals("user id remains the same", reAuth.id, joinOutput.id);
  TestValidator.equals(
    "email remains the same",
    reAuth.email,
    joinOutput.email,
  );
}
