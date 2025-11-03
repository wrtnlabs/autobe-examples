import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate permanent deletion of a user account by email.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate as a new user with a randomly generated email and password.
 * 2. Create a new todo user account with a unique email and password.
 * 3. Delete the created user account permanently using the email address.
 * 4. Confirm deletion by asserting no error occurs during deletion.
 *
 * All API calls strictly follow the provided DTO types and assert responses for
 * correctness with typia.assert. Random valid data conforming to required
 * formats are generated using typia.random and RandomGenerator.
 */
export async function test_api_user_permanent_deletion_by_email(
  connection: api.IConnection,
) {
  // 1. Join user to authenticate and obtain a token
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: { email, password } satisfies ITodoUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create a user account to be deleted; here email must be unique, generate new
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const newPassword = RandomGenerator.alphaNumeric(12);
  const createdUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: {
        email: newEmail,
        password: newPassword,
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(createdUser);
  TestValidator.equals(
    "created user's email matches",
    createdUser.email,
    newEmail,
  );

  // 3. Delete user account permanently by email
  await api.functional.todo.user.todoUsers.erase(connection, {
    todoUserEmail: newEmail,
  });

  // 4. Verification that deletion succeeded is implicit as no errors thrown; also
  // further validation like query is not defined, so test ends here
}
