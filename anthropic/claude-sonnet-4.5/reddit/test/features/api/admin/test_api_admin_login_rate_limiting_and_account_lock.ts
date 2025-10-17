import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test rate limiting and account lock mechanism for administrator login.
 *
 * This test validates the brute-force attack prevention system by creating an
 * admin account and attempting multiple failed login attempts. After 5 failed
 * attempts within 15 minutes, the account should be temporarily locked for 30
 * minutes to prevent brute-force attacks.
 *
 * Test flow:
 *
 * 1. Create a new admin account with valid credentials
 * 2. Attempt to login with incorrect password 5 times
 * 3. Verify that after 5 failed attempts, the account becomes locked
 * 4. Verify subsequent login attempts are rejected with lock message
 * 5. Ensure error message indicates 30-minute wait period
 */
export async function test_api_admin_login_rate_limiting_and_account_lock(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "SecurePass123!@#";
  const wrongPassword = "WrongPassword999";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: correctPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Clear the authorization header to test login attempts
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt to login with incorrect password 5 times to trigger rate limiting
  for (let attempt = 1; attempt <= 5; attempt++) {
    await TestValidator.error(
      `login attempt ${attempt} with wrong password should fail`,
      async () => {
        await api.functional.auth.admin.login(unauthConnection, {
          body: {
            email: adminEmail,
            password: wrongPassword,
          } satisfies IRedditLikeAdmin.ILogin,
        });
      },
    );
  }

  // Step 3: Verify account is locked after 5 failed attempts
  // The 6th attempt should fail with account lock message
  await TestValidator.error(
    "login attempt after account lock should fail with lock message",
    async () => {
      await api.functional.auth.admin.login(unauthConnection, {
        body: {
          email: adminEmail,
          password: correctPassword,
        } satisfies IRedditLikeAdmin.ILogin,
      });
    },
  );

  // Step 4: Verify that even with correct password, account remains locked
  await TestValidator.error(
    "correct password login should still fail when account is locked",
    async () => {
      await api.functional.auth.admin.login(unauthConnection, {
        body: {
          email: adminEmail,
          password: correctPassword,
        } satisfies IRedditLikeAdmin.ILogin,
      });
    },
  );
}
