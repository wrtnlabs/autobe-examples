import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validate the retrieval of user sessions by user ID.
 *
 * This test function simulates a user creating an account, generating a session
 * by creating a task, and then retrieving the user sessions using the provided
 * user ID. It ensures that the retrieved sessions match the expected data
 * structure and content.
 *
 * 1. Create a new user to test retrieval functionality
 * 2. Create a task to associate with user sessions
 * 3. Retrieve user sessions by user ID
 * 4. Validate the retrieved sessions against expected data
 */
export async function test_api_user_sessions_retrieve_by_user_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new user to test retrieval functionality
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        name: RandomGenerator.name(),
        password: "1234",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a task to associate with user sessions
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph(),
        dueDate: new Date().toISOString().split("T")[0],
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 3: Retrieve user sessions by user ID
  const sessions: IPageITodoListUserSession =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
    });
  typia.assert(sessions);

  // Step 4: Validate the retrieved sessions against expected data
  TestValidator.equals(
    "sessions data is an array",
    Array.isArray(sessions.data),
    true,
  );
  TestValidator.predicate(
    "sessions contain valid session IDs",
    sessions.data.every((session) => typeof session === "string"),
  );
}
