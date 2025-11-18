import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a user cannot delete another user's account (cross-user deletion
 * violation)
 *
 * This test verifies that the API prevents one user from deleting another
 * user's account. It follows a practical business security flow:
 *
 * 1. Register User A with random credentials and extract their ID.
 * 2. Register User B with different random credentials (to establish a different
 *    authorization context).
 * 3. While authenticated as User B, attempt to delete User A's account using their
 *    userId.
 * 4. Expect the operation to be rejected (should throw error and not delete User
 *    A).
 */
export async function test_api_user_account_delete_cross_user_violation(
  connection: api.IConnection,
) {
  // Step 1: Register User A (victim)
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA_password = typia.random<string & tags.Format<"password">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userA_email,
      password: userA_password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA);

  const userA_id = userA.id;

  // Step 2: Register User B (attacker) using a fresh unauthenticated connection (new auth context)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB_password = typia.random<string & tags.Format<"password">>();
  const userB = await api.functional.auth.user.join(unauthConnection, {
    body: {
      email: userB_email,
      password: userB_password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB);

  // Step 3: While authenticated as User B, attempt to delete User A's account (cross-user violation)
  await TestValidator.error(
    "User B cannot delete User A's account (cross-user violation should be denied)",
    async () => {
      await api.functional.todoList.user.users.erase(unauthConnection, {
        userId: userA_id,
      });
    },
  );
}
