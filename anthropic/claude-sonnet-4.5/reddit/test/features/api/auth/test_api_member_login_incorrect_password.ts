import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that login fails appropriately when an incorrect password is provided.
 *
 * This test validates the security behavior of the member authentication system
 * when a user attempts to login with valid username/email but incorrect
 * password. The system must reject the authentication attempt without leaking
 * information about whether the account exists.
 *
 * Test workflow:
 *
 * 1. Register a new member account with known credentials
 * 2. Attempt to login with correct username but incorrect password
 * 3. Verify that the login attempt fails with an error
 * 4. Confirm that no authentication tokens are issued
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with known credentials
  const correctPassword = "securePassword123";
  const incorrectPassword = "wrongPassword456";
  const username = RandomGenerator.name(1);
  const email = typia.random<string & tags.Format<"email">>();

  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: username,
        email: email,
        password: correctPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(registeredMember);

  // Step 2: Attempt to login with correct username but incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          username: username,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ILogin,
      });
    },
  );

  // Step 3: Also test with email and incorrect password
  await TestValidator.error(
    "login with email and incorrect password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: email,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ILogin,
      });
    },
  );
}
