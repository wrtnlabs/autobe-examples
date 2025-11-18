import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login failure for accounts with 'pending_verification' status.
 *
 * Validates that unverified accounts cannot authenticate and appropriate
 * guidance is provided to complete email verification.
 */
export async function test_api_user_login_pending_verification_account(
  connection: api.IConnection,
) {
  // Create user account with explicit pending verification status
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      status: "pending_verification",
      href: "https://todoapp.com/register" satisfies string &
        tags.Format<"uri"> as string,
      referrer: "https://todoapp.com" satisfies string &
        tags.Format<"uri"> as string,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Verify account was created with pending verification status
  TestValidator.equals(
    "user account should have pending_verification status",
    createdUser.status,
    "pending_verification",
  );

  // Attempt to login with the pending verification account
  await TestValidator.error(
    "login should fail for pending verification account",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: userPassword,
          href: "https://todoapp.com/login" satisfies string &
            tags.Format<"uri"> as string,
          referrer: "https://todoapp.com" satisfies string &
            tags.Format<"uri"> as string,
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
