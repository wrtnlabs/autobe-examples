import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test login failure with non-existent username.
 *
 * This test validates that the authentication system properly rejects login
 * attempts when the provided username does not exist in the system. The API
 * should return a generic authentication error without revealing whether the
 * username exists, preventing user enumeration attacks.
 *
 * Test Steps:
 *
 * 1. Generate random credentials for a non-existent user
 * 2. Attempt to login with the non-existent username
 * 3. Verify that the login attempt fails with an error
 * 4. Confirm that no authentication tokens are issued
 */
export async function test_api_member_login_nonexistent_username(
  connection: api.IConnection,
) {
  // Generate random non-existent username
  const nonexistentUsername = RandomGenerator.alphaNumeric(12);
  const randomPassword = RandomGenerator.alphaNumeric(16);

  // Prepare login request body with non-existent credentials
  const loginBody = {
    username: nonexistentUsername,
    password: randomPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ILogin;

  // Attempt login with non-existent username - should fail
  await TestValidator.error(
    "login should fail with non-existent username",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginBody,
      });
    },
  );
}
