import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_user_update_by_email(
  connection: api.IConnection,
) {
  // 1. Authenticate new user by calling join API
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create user account with the same email
  const createdUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(createdUser);
  // Assert that email matches
  TestValidator.equals(
    "created user email matches input",
    createdUser.email,
    email,
  );

  // 3. Update user password by providing new password
  const newPassword: string = RandomGenerator.alphaNumeric(16);
  const updatedUser: ITodoUser =
    await api.functional.todo.user.todoUsers.update(connection, {
      todoUserEmail: email, // path parameter identifies user
      body: {
        password: newPassword,
      } satisfies ITodoUser.IUpdate,
    });
  typia.assert(updatedUser);

  // 4. Validate that updated user's email is unchanged and other timestamps are valid
  TestValidator.equals(
    "updated user email unchanged",
    updatedUser.email,
    email,
  );
  TestValidator.predicate(
    "created_at looks like ISO date-time",
    typeof updatedUser.created_at === "string" &&
      updatedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at looks like ISO date-time",
    typeof updatedUser.updated_at === "string" &&
      updatedUser.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is either null or string",
    updatedUser.deleted_at === null ||
      typeof updatedUser.deleted_at === "string" ||
      updatedUser.deleted_at === undefined,
  );
}
