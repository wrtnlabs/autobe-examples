import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_search_by_description(
  connection: api.IConnection,
) {
  const authUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authUser);

  const searchTerms = [
    "Buy groceries",
    "Buy milk and bread",
    "Buy eggs",
    "Walk the dog",
    "Finish project",
  ];

  const createdTasks = await Promise.all(
    searchTerms.map(async (desc) => {
      const task = await api.functional.todoList.user.tasks.create(connection, {
        body: { description: desc } satisfies ITodoListTask.ICreate,
      });
      typia.assert(task);
      return task;
    }),
  );

  const searchCriteria = "buy";
  const searchResponse = await api.functional.todoList.user.tasks.index(
    connection,
    { body: searchCriteria satisfies ITodoListTask.IRequest },
  );
  typia.assert(searchResponse);

  const matchingTasks = searchResponse.data.filter((task) =>
    task.description.toLowerCase().includes(searchCriteria.toLowerCase()),
  );

  TestValidator.equals(
    "pagination matches expected",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches expected",
    searchResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count matches task count",
    () => searchResponse.pagination.records >= matchingTasks.length,
  );
  TestValidator.equals(
    "search result count matches expected number of matches",
    searchResponse.data.length,
    matchingTasks.length,
  );

  for (const task of searchResponse.data) {
    TestValidator.predicate(
      "each returned task description contains search term (case-insensitive)",
      () =>
        task.description.toLowerCase().includes(searchCriteria.toLowerCase()),
    );
  }

  TestValidator.predicate(
    "all returned tasks belong to authenticated user",
    () => {
      const createdTaskIds = new Set(createdTasks.map((t) => t.id));
      const returnedTaskIds = new Set(searchResponse.data.map((t) => t.id));
      return (
        returnedTaskIds.size === searchResponse.data.length &&
        Array.from(returnedTaskIds).every((id) => createdTaskIds.has(id))
      );
    },
  );
}
