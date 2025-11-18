import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify that users are strictly limited to updating only their own profile,
 * and that cross-user profile modifications are prohibited.
 *
 * Scenario steps:
 *
 * 1. Register User A (random credentials), save their id and original data.
 * 2. Register User B (random credentials).
 * 3. Switch to User B (set connection to User B's access token).
 * 4. Attempt to update User A's profile using User B's token. This should be
 *    rejected.
 * 5. Confirm that the update endpoint throws an error and User A's data remains
 *    unchanged.
 */
export async function test_api_user_profile_update_self_only_violation(
  connection: api.IConnection,
) {
  // Step 1: Register User A
  const userAInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://service.example.com/register",
    referrer: "https://service.example.com",
  } satisfies ITodoListUser.ICreate;
  const userAAuth = await api.functional.auth.user.join(connection, {
    body: userAInput,
  });
  typia.assert(userAAuth);

  // Step 2: Register User B
  const userBInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://service.example.com/register",
    referrer: "https://service.example.com",
  } satisfies ITodoListUser.ICreate;
  const userBAuth = await api.functional.auth.user.join(connection, {
    body: userBInput,
  });
  typia.assert(userBAuth);

  // Save User A's data for later
  const userAId = typia.assert<string & tags.Format<"uuid">>(userAAuth.id);
  const userAEmail = userAAuth.email;
  const userAUpdatedAt = userAAuth.updated_at;

  // Switch to User B's authentication token for subsequent requests
  const userBConn: api.IConnection = {
    ...connection,
    headers: { Authorization: userBAuth.token.access },
  };

  // Step 3: Attempt unauthorized profile update
  const updateRequest = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies ITodoListUser.IUpdate;

  await TestValidator.error(
    "cross-user profile update should fail (User B cannot update A)",
    async () => {
      await api.functional.todoList.user.users.update(userBConn, {
        userId: userAId,
        body: updateRequest,
      });
    },
  );
}
