import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Tests that a user cannot soft-delete another user's account (authorization
 * enforced).
 *
 * 1. Register User A (receive tokens and userId)
 * 2. Register User B (receive tokens and userId)
 * 3. Ensure connection is authenticated as User A
 * 4. Attempt to erase User B as User A (should fail)
 * 5. Assert that an error occurs for forbidden deletion
 * 6. [Optional] Confirm User B's account is still present (would require read API)
 */
export async function test_api_user_account_soft_delete_forbidden_on_others(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://test-app.local/register",
      referrer: "https://test-app.local/",
      ip: null,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);

  // 2. Register User B
  // Important: To switch context/user session, create a new unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(unauthConn, {
    body: {
      email: userBEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://test-app.local/register",
      referrer: "https://test-app.local/",
      ip: null,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);

  // 3. Ensure connection is authenticated as User A
  // Calling join authenticates connection; no action required unless multi-login is needed

  // 4. Attempt to erase User B as User A
  await TestValidator.error(
    "User A cannot delete User B's account",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: userB.id,
      });
    },
  );

  // (Optional: check user B is not deleted, but no read API is accessible in the current scope)
}
