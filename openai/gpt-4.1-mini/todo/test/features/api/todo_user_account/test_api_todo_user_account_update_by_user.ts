import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_user_account_update_by_user(
  connection: api.IConnection,
) {
  // 1. Authenticate user (join)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoUser.ICreate;
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinInput },
  );
  typia.assert(authorized);

  // 2. Create initial todo user account
  const createInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies ITodoUser.ICreate;
  const created: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    { body: createInput },
  );
  typia.assert(created);
  TestValidator.equals(
    "created email matches input",
    created.email,
    joinInput.email,
  );

  // 3. Update todo user with new password
  // Make sure to update password only (email is path parameter)
  const updatePassword = RandomGenerator.alphaNumeric(20);
  const updateInput = {
    password: updatePassword,
  } satisfies ITodoUser.IUpdate;

  const updated: ITodoUser = await api.functional.todo.user.todoUsers.update(
    connection,
    {
      todoUserEmail: created.email,
      body: updateInput,
    },
  );
  typia.assert(updated);

  // 4. Assertions
  // Email remains the same
  TestValidator.equals(
    "updated email matches original",
    updated.email,
    created.email,
  );

  // ID remains the same
  TestValidator.equals("updated id remains same", updated.id, created.id);

  // updated_at timestamp should be greater than or equal to created_at
  // Compare ISO strings lexicographically
  TestValidator.predicate(
    "updated_at timestamp is >= created_at",
    updated.updated_at >= updated.created_at,
  );

  // deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updated.deleted_at === null || updated.deleted_at === undefined,
  );
}
