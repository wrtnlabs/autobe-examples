import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_user_retrieval_by_user(
  connection: api.IConnection,
) {
  // Step 1: User registration to create an authenticated user and obtain user ID
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorized: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorized);

  // Step 2: Retrieve user profile data by ID for the authenticated user
  const user: ITodoListTodoListUser =
    await api.functional.todoList.user.todoListUsers.at(connection, {
      id: authorized.id,
    });
  typia.assert(user);

  // Validation checks: Consistency between registered user data and retrieved data
  TestValidator.equals(
    "retrieved user id matches authorized id",
    user.id,
    authorized.id,
  );
  TestValidator.equals(
    "retrieved user email matches registration email",
    user.email,
    userCreateBody.email,
  );
  TestValidator.equals(
    "retrieved user display_name matches registration name",
    user.display_name,
    userCreateBody.name,
  );

  // Username and password_hash validation - username must be string, password_hash is stored hashed string
  TestValidator.predicate(
    "retrieved user username is a non-empty string",
    typeof user.username === "string" && user.username.length > 0,
  );
  TestValidator.predicate(
    "retrieved user password_hash is a non-empty string",
    typeof user.password_hash === "string" && user.password_hash.length > 0,
  );

  // Role must be 'user' as the registration endpoint creates standard users
  TestValidator.equals("retrieved user role is 'user'", user.role, "user");

  // is_active flag must be true for a newly created user
  TestValidator.predicate(
    "retrieved user is_active is true",
    user.is_active === true,
  );

  // joined_at must be a valid ISO date-time string
  TestValidator.predicate(
    "retrieved user joined_at is valid ISO date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(user.joined_at),
  );

  // last_login_at can be undefined or a ISO date-time string
  if (user.last_login_at !== undefined) {
    TestValidator.predicate(
      "retrieved user last_login_at is valid ISO date-time string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(user.last_login_at),
    );
  }
}
