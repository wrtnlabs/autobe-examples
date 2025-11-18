import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate user can view own Todo List account details after registration.
 *
 * 1. Register a new user
 * 2. Authenticate (token set by API automatically)
 * 3. Retrieve own account details via GET /todoList/user/users/{userId}
 * 4. Validate business fields: email, id, locked, created_at, updated_at (all
 *    exist, correct types)
 * 5. Validate 'deleted_at' is present and null (active user)
 * 6. Confirm absence of password/hash fields
 */
export async function test_api_todo_list_user_detail_view_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userInput = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const authorized = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(authorized);

  // 2. 'connection' context now authenticated due to token auto-set by join

  // 3. Retrieve own details using their userId
  const user = await api.functional.todoList.user.users.at(connection, {
    userId: authorized.id,
  });
  typia.assert(user);

  // 4. Validate business fields
  TestValidator.equals("user id matches", user.id, authorized.id);
  TestValidator.equals("user email matches", user.email, authorized.email);
  TestValidator.equals("user locked matches", user.locked, authorized.locked);
  TestValidator.equals(
    "user created_at matches",
    user.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "user updated_at matches",
    user.updated_at,
    authorized.updated_at,
  );

  // 5. 'deleted_at' must exist and be null for active user
  TestValidator.equals(
    "deleted_at must be null for active user",
    user.deleted_at,
    null,
  );

  // 6. Ensure password/hash fields are not present (handled by DTO types)
}
