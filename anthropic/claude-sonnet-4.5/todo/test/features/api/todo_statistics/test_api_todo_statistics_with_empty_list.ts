import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoStatistics";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving todo statistics for a newly registered user with empty todo
 * list.
 *
 * This test validates the edge case where a user has just registered and has
 * not created any todo items yet. It ensures that the statistics endpoint
 * correctly handles the empty dataset scenario and returns proper
 * zero-initialized values for all statistical metrics.
 *
 * Workflow:
 *
 * 1. Register a new user account using the join endpoint to establish
 *    authentication
 * 2. Immediately retrieve todo statistics without creating any todos
 * 3. Verify that all statistical metrics are zero (total_count, completed_count,
 *    pending_count, completion_rate)
 * 4. Ensure the endpoint is accessible and returns valid statistics structure even
 *    with no data
 */
export async function test_api_todo_statistics_with_empty_list(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userCreateData,
    },
  );
  typia.assert(user);

  // Step 2: Retrieve statistics immediately without creating any todos
  const statistics: ITodoListTodoStatistics =
    await api.functional.todoList.user.todos.statistics.at(connection);
  typia.assert(statistics);

  // Step 3: Validate that all statistics are zero for empty todo list
  TestValidator.equals(
    "total_count should be 0 for new user",
    statistics.total_count,
    0,
  );

  TestValidator.equals(
    "completed_count should be 0 for new user",
    statistics.completed_count,
    0,
  );

  TestValidator.equals(
    "pending_count should be 0 for new user",
    statistics.pending_count,
    0,
  );

  TestValidator.equals(
    "completion_rate should be 0 for new user",
    statistics.completion_rate,
    0,
  );
}
