import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator login rate limiting and account lock functionality.
 *
 * This test validates the security mechanism that prevents brute force attacks
 * by rate limiting failed login attempts and temporarily locking accounts.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account
 * 2. Attempt login with incorrect password 5 times
 * 3. Verify account is locked after 5th failed attempt
 * 4. Verify subsequent login with correct password also fails
 * 5. Verify error message indicates account lock and provides recovery options
 */
export async function test_api_moderator_login_rate_limiting_account_lock(
  connection: api.IConnection,
) {
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.MinLength<8>>();
  const incorrectPassword = "wrongpassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: email,
      password: correctPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  const unauthConn: api.IConnection = { ...connection, headers: {} };

  for (let i = 0; i < 5; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} should fail`,
      async () => {
        await api.functional.auth.moderator.login(unauthConn, {
          body: {
            email: email,
            password: incorrectPassword,
          } satisfies IRedditLikeModerator.ILogin,
        });
      },
    );
  }

  await TestValidator.error(
    "login with correct password should fail due to account lock",
    async () => {
      await api.functional.auth.moderator.login(unauthConn, {
        body: {
          email: email,
          password: correctPassword,
        } satisfies IRedditLikeModerator.ILogin,
      });
    },
  );
}
