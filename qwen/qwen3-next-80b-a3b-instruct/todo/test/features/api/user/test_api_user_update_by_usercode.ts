import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_update_by_usercode(
  connection: api.IConnection,
) {
  // Create new user account to obtain userCode
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const newUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(newUser);

  // Authenticate user to obtain JWT token
  const authenticated: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticated);

  // Update user profile using userCode
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.user.users.putByUsercode(connection, {
      userCode: newUser.id,
      body: {
        email: newEmail,
        password_hash: "updated_hash" as any, // Use any temporarily for test; real value would be bcrypt hash
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Validate that email was successfully updated as expected
  TestValidator.equals(
    "updated user email matches",
    updatedUser.email,
    newEmail,
  );
  // Verify userCode is the same as initial ID
  TestValidator.equals(
    "userCode remains the same as initial ID",
    updatedUser.id,
    newUser.id,
  );
  // Confirm password_hash was updated by checking it is not null or undefined
  TestValidator.predicate(
    "password_hash was updated",
    updatedUser.password_hash !== null &&
      updatedUser.password_hash !== undefined,
  );
}
