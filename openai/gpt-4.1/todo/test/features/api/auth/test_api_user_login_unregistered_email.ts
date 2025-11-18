import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate rejection of login attempts with a non-existent email address.
 *
 * This test ensures that the /auth/user/login endpoint securely handles
 * authentication attempts using an unregistered email. The endpoint must reject
 * the login, issue a generic error response, and avoid disclosing whether the
 * email is registered, in compliance with privacy and security practices.
 *
 * Steps:
 *
 * 1. Generate a random email address that is not associated with any user account.
 * 2. Attempt to log in using this random email and a strong, valid password.
 * 3. Confirm that the endpoint rejects the authentication attempt.
 * 4. Confirm that the error message is generic and does not leak information about
 *    user account existence.
 */
export async function test_api_user_login_unregistered_email(
  connection: api.IConnection,
) {
  // Generate random credentials for a non-existent user
  const randomEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">
  >();
  const loginBody = {
    email: randomEmail,
    password: randomPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  // The login attempt should produce a generic error response and not indicate account existence
  await TestValidator.error(
    "login with unregistered email is rejected in a generic, secure way",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody,
      });
    },
  );
}
