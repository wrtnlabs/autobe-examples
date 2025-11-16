import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that login fails when attempting to authenticate with an email address
 * that does not exist in the system.
 *
 * This test validates the security behavior of the member login endpoint by
 * attempting authentication with a non-existent email address. The system
 * should reject the login attempt with a generic authentication error that does
 * not reveal whether the email exists in the database, preventing user
 * enumeration attacks.
 *
 * Test Steps:
 *
 * 1. Generate a random email address that doesn't exist in the system
 * 2. Attempt to login using the non-existent email with any password
 * 3. Verify that the login attempt fails with an error
 * 4. Confirm that no authentication tokens are issued
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Attempt login with non-existent email should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(12),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ILogin,
      });
    },
  );
}
