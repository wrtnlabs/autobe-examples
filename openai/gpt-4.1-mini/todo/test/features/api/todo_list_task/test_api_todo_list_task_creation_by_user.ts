import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_list_task_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user with valid and realistic email and password
  const email = typia.random<string & tags.Format<"email">>();
  const ip = null; // client IP is optional and can be null
  const href = `https://example.com/register`;
  const referrer = `https://google.com/search`;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password: "StrongPassword123!",
        ip,
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Using authenticated context, query filtered todo list tasks
  // Prepare request body with random search parameters
  const isDone = false;
  const titleSearchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });
  const page = 1;
  const limit = 10;

  const requestBody = {
    is_completed: isDone,
    search: titleSearchTerm,
    page,
    limit,
    order_by: "created_at",
    order_dir: "desc",
  } satisfies ITodoListTask.IRequest;

  const taskPage: IPageITodoListTask.ISummary =
    await api.functional.todoList.user.todoListTasks.index(connection, {
      body: requestBody,
    });
  typia.assert(taskPage);

  // 3. Verify pagination meta properties are sane
  TestValidator.predicate(
    "page number positive",
    taskPage.pagination.current > 0,
  );
  TestValidator.predicate("page limit positive", taskPage.pagination.limit > 0);
  TestValidator.predicate(
    "total pages non-negative",
    taskPage.pagination.pages >= 0,
  );

  // 4. Verify each task in results matches filter conditions
  for (const task of taskPage.data) {
    typia.assert(task);
    // task.is_completed must be equal to isDone filter
    TestValidator.equals("task completion filter", task.is_completed, isDone);
    // task.title should contain the search term (search) - approximate check
    TestValidator.predicate(
      "task title includes search term",
      task.title.includes(titleSearchTerm),
    );
  }
}
