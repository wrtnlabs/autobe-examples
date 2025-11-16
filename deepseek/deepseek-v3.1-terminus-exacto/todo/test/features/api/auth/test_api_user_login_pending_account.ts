import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test authentication attempt with a user account that has 'pending' status.
 *
 * Validates that pending accounts cannot authenticate successfully and receive
 * appropriate status-based error messages. This test ensures the system
 * enforces proper authentication flow where only 'active' status accounts can
 * login.
 */
export async function test_api_user_login_pending_account(
  connection: api.IConnection,
) {
  // Create a pending user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const currentDate = new Date().toISOString();

  const pendingUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // This will be properly hashed by the API
      created_at: typia.random<string & tags.Format<"date-time">>(),
      updated_at: typia.random<string & tags.Format<"date-time">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(pendingUser);

  // Verify that new account has pending status as per API documentation
  TestValidator.equals(
    "new user account should have pending status",
    pendingUser.status,
    "pending",
  );

  // Verify that login fails for pending account
  await TestValidator.error(
    "pending account should not be able to login",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: userPassword,
          href: "http://localhost:3000/auth/login",
          referrer: "http://localhost:3000/",
        } satisfies ITodoAppUser.ICredentials,
      });
    },
  );
}
