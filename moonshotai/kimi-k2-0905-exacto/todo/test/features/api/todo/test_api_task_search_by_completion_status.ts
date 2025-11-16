import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_search_by_completion_status(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      ip: "127.0.0.1",
      href: "https://localhost:3000/register",
      referrer: "https://localhost:3000/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create tasks (all tasks are created with "pending" status by default)
  const tasksToCreate = 7;
  const createdTasks: ITodoAppTask[] = [];

  for (let i = 0; i < tasksToCreate; i++) {
    const task = await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Task ${i + 1}`,
        description: {
          type: "full" as const,
          content: RandomGenerator.paragraph(),
        },
      } satisfies ITodoAppTask.ICreate,
    });
    typia.assert(task);
    createdTasks.push(task);
  }

  // Step 3: Test filtering with different status values

  // Test filtering by "pending" status (should return all tasks since we only have pending tasks)
  const pendingResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(pendingResponse);

  TestValidator.equals(
    "pending tasks count equal total tasks",
    pendingResponse.data.length,
    tasksToCreate,
  );
  TestValidator.predicate(
    "all tasks have pending status",
    pendingResponse.data.every((task) => task.status === "pending"),
  );

  // Test filtering by "all" status (should return all tasks)
  const allResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(allResponse);

  TestValidator.equals(
    "all status shows all tasks",
    allResponse.data.length,
    tasksToCreate,
  );
  TestValidator.equals(
    "all tasks have correct owner",
    allResponse.data.every((task) => task.user.id === user.id),
    true,
  );

  // Test filtering without status parameter (should default to all tasks)
  const defaultResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(defaultResponse);

  TestValidator.equals(
    "default pagination shows all tasks",
    defaultResponse.data.length,
    tasksToCreate,
  );

  // Test filtering by "completed" status (should return empty since we have no completed tasks)
  const completedResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "completed",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(completedResponse);

  TestValidator.equals(
    "completed tasks should be empty",
    completedResponse.data.length,
    0,
  );

  // Step 4: Test pagination with status filtering
  const paginatedResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        status: "pending",
        page: 2,
        limit: 3,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "paginated response has remaining tasks",
    paginatedResponse.data.length,
    1,
  ); // 7 total, page 2 with limit 3 shows 1 task
  TestValidator.predicate(
    "paginated tasks still have pending status",
    paginatedResponse.data.every((task) => task.status === "pending"),
  );
}
