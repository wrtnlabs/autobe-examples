import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_without_role_context(
  connection: api.IConnection,
) {
  // Create new user account to establish authentication context
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Retrieve the same user account by userId
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: user.id,
    });
  typia.assert(retrievedUser);

  // Validate that the retrieved user ID matches the created user ID
  TestValidator.equals(
    "retrieved user ID matches created user",
    retrievedUser,
    user.id,
  );
}
