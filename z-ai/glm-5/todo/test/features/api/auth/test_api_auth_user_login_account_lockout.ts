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
 * Test account lockout mechanism after 5 consecutive failed login attempts.
 *
 * This test validates the brute-force protection mechanism:
 * 1. Create a user account with known credentials
 * 2. Perform 5 consecutive login attempts with incorrect password
 * 3. Verify the account becomes locked after 5 failed attempts
 * 4. Verify login with correct credentials is rejected while locked
 */
export async function test_api_auth_user_login_account_lockout(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a test user with known credentials
  const testEmail = typia.random<string & tags.Format<"email"> & tags.MaxLength<254>>();
  const testPassword = "Password123!Test"; // Meets password requirements: 8+ chars, uppercase, lowercase, digit, special char
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      password_confirm: testPassword,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(joinResult);
  // Step 2: Perform 4 failed login attempts (before lockout triggers)
  const wrongPassword = "WrongPassword123!";
  for (let attempt = 1; attempt <= 4; attempt++) {
    await TestValidator.error(
      `Failed login attempt ${attempt} should return error`,
      async () => {
        const loginConnection: api.IConnection = { host: connection.host };
        await authorize_user_login(loginConnection, {
          body: {
            email: testEmail,
            password: wrongPassword,
            href: "https://test.example.com/login",
            referrer: "https://test.example.com",
          } satisfies ITodoAppUser.ILogin,
        });
      },
    );
  }
  // Step 3: 5th failed attempt should trigger account lockout
  await TestValidator.error(
    "5th failed login attempt should trigger account lockout",
    async () => {
      const fifthAttemptConnection: api.IConnection = { host: connection.host };
      await authorize_user_login(fifthAttemptConnection, {
        body: {
          email: testEmail,
          password: wrongPassword,
          href: "https://test.example.com/login",
          referrer: "https://test.example.com",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
  // Step 4: Verify that login with correct credentials is rejected (account locked)
  await TestValidator.error(
    "Login with correct credentials should be rejected while account is locked",
    async () => {
      const lockedConnection: api.IConnection = { host: connection.host };
      await authorize_user_login(lockedConnection, {
        body: {
          email: testEmail,
          password: testPassword,
          href: "https://test.example.com/login",
          referrer: "https://test.example.com",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}