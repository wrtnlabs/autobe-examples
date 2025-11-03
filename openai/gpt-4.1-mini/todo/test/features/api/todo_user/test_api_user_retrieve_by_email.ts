import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_user_retrieve_by_email(
  connection: api.IConnection,
) {
  // 1. Authenticate and create a new user account
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ITodoUser.ICreate;

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a todo user matching the email
  const todoUserCreateBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
  } satisfies ITodoUser.ICreate;

  const todoUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: todoUserCreateBody,
    },
  );
  typia.assert(todoUser);

  TestValidator.equals(
    "created todo user email equals input email",
    todoUser.email,
    userCreateBody.email,
  );

  // 3. Retrieve the user details by email
  const retrievedUser: ITodoUser = await api.functional.todo.user.todoUsers.at(
    connection,
    {
      todoUserEmail: todoUser.email,
    },
  );
  typia.assert(retrievedUser);

  TestValidator.equals(
    "retrieved user id equals created user id",
    retrievedUser.id,
    todoUser.id,
  );
  TestValidator.equals(
    "retrieved user email equals created email",
    retrievedUser.email,
    todoUser.email,
  );
  TestValidator.equals(
    "retrieved user created_at equals created created_at",
    retrievedUser.created_at,
    todoUser.created_at,
  );
  TestValidator.equals(
    "retrieved user updated_at equals created updated_at",
    retrievedUser.updated_at,
    todoUser.updated_at,
  );
  TestValidator.equals(
    "retrieved user deleted_at equals created deleted_at",
    retrievedUser.deleted_at ?? null,
    todoUser.deleted_at ?? null,
  );
}
