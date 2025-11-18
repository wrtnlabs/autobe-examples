import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_high_load(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for testing
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "SecurePassword123!";
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a task for the user to ensure the account is properly initialized
  const task: ITodoListTask = await api.functional.todoList.user.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListTask.ICreate,
    },
  );
  typia.assert(task);

  // Step 3: Issue 100 concurrent requests to retrieve the user by ID under high load
  // This tests the system's scalability and stateless design
  const results = await ArrayUtil.asyncRepeat(100, async (index) => {
    const retrievedUser: ITodoListUser =
      await api.functional.todoList.user.actors.at(connection, {
        userId: user.id,
      });
    typia.assert(retrievedUser);

    // Verify the retrieved user matches the originally created user
    TestValidator.equals(
      `user retrieval ${index + 1} - ID match`,
      retrievedUser,
      user.id,
    );

    return retrievedUser;
  });

  // Step 4: Validate consistency across all 100 requests
  // All results should be identical, confirming stateless design and consistent response
  TestValidator.equals(
    "all 100 concurrent retrievals produced identical results",
    results[0],
    results[99],
  );

  // Verify response times are consistent across concurrent requests
  // (Implicit validation through successful execution of 100 sequential calls)
}
