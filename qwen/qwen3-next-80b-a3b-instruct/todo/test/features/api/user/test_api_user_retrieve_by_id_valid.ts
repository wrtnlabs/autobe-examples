import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_valid(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "securePassword123!",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);
  const userId: string = joinResponse.id;

  // Step 2: Create a task for this user to satisfy prerequisites
  const taskDescription: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const taskResponse: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        description: taskDescription,
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(taskResponse);

  // Step 3: Retrieve the user account by ID to validate response
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: userId,
    });
  typia.assert(retrievedUser);

  // Step 4: Validate that the retrieved user contains the correct user ID
  TestValidator.equals(
    "retrieved user ID matches created user ID",
    retrievedUser,
    userId,
  );
}
