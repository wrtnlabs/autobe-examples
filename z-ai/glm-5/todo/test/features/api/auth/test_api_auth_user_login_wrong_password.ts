import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test login failure with incorrect password.
 *
 * This test verifies that:
 * 1. A user can register successfully with valid credentials
 * 2. Login with the correct email but wrong password fails
 * 3. The authentication properly rejects invalid credentials
 *
 * The API implements security measures including:
 * - Timing-safe comparison to prevent timing attacks
 * - Generic error codes (INVALID_CREDENTIALS) to prevent email enumeration
 * - Failed attempt tracking (handled internally by the server)
 */
export async function test_api_auth_user_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test credentials
  const correctPassword = "SecurePass123!@#";
  const wrongPassword = "WrongPassword456!";
  const email = typia.random<string & tags.Format<"email">>();
  // Step 1: Create a new user account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(joinConnection, {
    body: {
      email: email satisfies string as string,
      password: correctPassword,
      password_confirm: correctPassword,
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    },
  });
  typia.assert(authorizedUser);
  // Verify the user was created with the correct email
  TestValidator.equals(
    "user email matches",
    authorizedUser.display_name,
    email satisfies string as string,
  );
  // Step 2: Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  // Expect the login to fail - the API should reject invalid credentials
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.todoApp.auth.user.login(loginConnection, {
        body: {
          email: email satisfies string as string,
          password: wrongPassword,
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}