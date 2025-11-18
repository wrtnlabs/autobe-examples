import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the user self-service soft deletion workflow for their own account.
 *
 * 1. Register a new user via POST /auth/user/join and get IAuthorized response
 *    (including user.id, token)
 * 2. Attempt soft-deleting with no authentication (should fail)
 * 3. Soft-delete the account with correct authentication as the owner
 * 4. Attempt to use the token after deletion (should fail to access protected
 *    endpoint)
 * 5. (If possible) Check that the user row is not physically deleted (just check
 *    operation returns void and does not throw) and that no further access is
 *    possible.
 */
export async function test_api_user_soft_delete_own_account(
  connection: api.IConnection,
) {
  // 1. Register user
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registrationBody });
  typia.assert(authorizedUser);

  // 2. Attempt deletion with no authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "soft delete fails for unauthenticated actor",
    async () => {
      await api.functional.todoList.user.users.erase(unauthConn, {
        userId: authorizedUser.id,
      });
    },
  );

  // 3. Soft-delete with authentication (should succeed)
  await api.functional.todoList.user.users.erase(connection, {
    userId: authorizedUser.id,
  });

  // 4. Attempt to use the token after deletion (should fail)
  await TestValidator.error(
    "user cannot use token after self deletion",
    async () => {
      // try to soft delete again, should now fail as token is invalid
      await api.functional.todoList.user.users.erase(connection, {
        userId: authorizedUser.id,
      });
    },
  );
}
