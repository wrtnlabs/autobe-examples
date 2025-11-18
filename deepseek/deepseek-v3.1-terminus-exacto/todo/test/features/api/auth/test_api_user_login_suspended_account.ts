import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login failure for accounts with 'suspended' status.
 *
 * Validates account suspension enforcement and appropriate error messaging
 * guiding users through account recovery processes. This test ensures that
 * suspended accounts cannot authenticate even with correct credentials.
 */
export async function test_api_user_login_suspended_account(
  connection: api.IConnection,
) {
  // Generate random test data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userName = RandomGenerator.name();

  // Create a user account with suspended status
  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      status: "suspended",
      href: "https://example.com/app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Verify the user was created with suspended status
  TestValidator.equals(
    "user status should be suspended",
    createdUser.status,
    "suspended",
  );

  // Attempt to login with the suspended account - this should fail
  await TestValidator.error(
    "login should fail for suspended account",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: userPassword,
          href: "https://example.com/app",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
