import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * End-to-end test for permanent self-deletion of user account and all
 * associated data in the Todo List application.
 *
 * Steps:
 *
 * 1. Register a new unique user via the join API.
 * 2. The join call authenticates the user (token in connection.headers).
 * 3. (Normally: would create todos and sessions here, but no API available.)
 * 4. Self-delete the account by calling DELETE /todoList/user/users/self as the
 *    authenticated user.
 * 5. (Normally: would check data removal, but no API for further validation, so
 *    cannot check data or re-login.)
 */
export async function test_api_user_self_deletion_and_data_removal(
  connection: api.IConnection,
) {
  // 1. Register a new unique user
  const joinInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<255>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional and omitted
  } satisfies ITodoListUser.IJoin;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinInput });
  typia.assert(userAuth);
  TestValidator.equals(
    "registered email matches input",
    userAuth.email,
    joinInput.email,
  );
  // Token set in connection.headers automatically

  // 2. Self-delete the account with authentication
  await api.functional.todoList.user.users.self.erase(connection);

  // 3. (No login endpoint provided, so cannot test re-login is impossible. If login endpoint were available, would test that login with the same credentials fails.)
  // 4. (No APIs to verify data removal, so cannot check todos, session data, or audit logs. Would check if available.)
}
