import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_large_task_set(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with valid credentials
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePass123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Use the created user account's ID to create 1000 non-unique tasks
  const userId: string = user.id;

  // Create a large set of 1000 tasks
  const taskBodies: ITodoListTask.ICreate[] = ArrayUtil.repeat(1000, () => ({
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  }));

  // Create tasks in bulk with 5ms delays to avoid triggering rate-limiting
  const tasks: ITodoListTask[] = [];
  for (const { description } of taskBodies) {
    const createdTask: ITodoListTask =
      await api.functional.todoList.user.tasks.create(connection, {
        body: {
          description,
        } satisfies ITodoListTask.ICreate,
      });
    typia.assert(createdTask);
    tasks.push(createdTask);
    // Small delay to avoid triggering anti-abuse systems under heavy load
    await new Promise((r) => setTimeout(r, 5));
  }

  // Step 3: Retrieve the user account by ID to validate large task set response
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId,
    });
  typia.assert(retrievedUser);

  // Step 4: Validate the user retrieval
  TestValidator.equals(
    "retrieved user id matches created user",
    retrievedUser,
    user.id,
  );
  TestValidator.predicate("user has at least 1000 tasks", tasks.length >= 1000);
}
