import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login failure for accounts with 'locked' status due to security
 * measures. Validates account locking mechanisms and appropriate security
 * messaging for locked accounts.
 */
export async function test_api_user_login_locked_account(
  connection: api.IConnection,
) {
  // Step 1: Create a locked user account
  const lockedUserEmail = typia.random<string & tags.Format<"email">>();
  const lockedUserPassword = "SecurePassword123";

  const lockedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: lockedUserEmail,
      password: lockedUserPassword,
      name: RandomGenerator.name(),
      status: "locked",
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(lockedUser);

  // Verify the account was created with locked status
  TestValidator.equals(
    "account status should be locked",
    lockedUser.status,
    "locked",
  );

  // Step 2: Attempt to login with the locked account
  await TestValidator.error(
    "locked account should fail authentication",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: lockedUserEmail,
          password: lockedUserPassword,
          href: "https://example.com/auth/login",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
