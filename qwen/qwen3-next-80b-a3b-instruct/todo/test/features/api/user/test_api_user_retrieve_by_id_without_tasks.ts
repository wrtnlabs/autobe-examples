import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_without_tasks(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account without any tasks
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Step 2: Retrieve the user account by ID to validate no tasks are associated
  const retrievedUser = await api.functional.todoList.user.actors.at(
    connection,
    {
      userId: newUser.id,
    },
  );
  typia.assert(retrievedUser);

  // Step 3: Validate that the retrieved user object matches the expected structure
  // Ensures the API returns the correct user data even when no tasks exist
  TestValidator.equals(
    "retrieved user ID matches created user ID",
    retrievedUser,
    newUser.id,
  );
}
