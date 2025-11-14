import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const createdUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(createdUser);

  // Authenticate the user
  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Update user profile with new email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.user.users.putByUserid(connection, {
      userId: authenticatedUser.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser);
  TestValidator.equals("user email was updated", updatedUser.email, newEmail);
}
