import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_list_sorting_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication via join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create todos with start_date and due_date set
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Create 3 todos with start_date and due_date
  const todoWithDates1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(now.getTime() + oneDayMs).toISOString(),
        dueDate: new Date(now.getTime() + oneDayMs * 3).toISOString(),
      },
    },
  );
  typia.assert(todoWithDates1);
  const todoWithDates2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(now.getTime() + oneDayMs * 2).toISOString(),
        dueDate: new Date(now.getTime() + oneDayMs * 5).toISOString(),
      },
    },
  );
  typia.assert(todoWithDates2);
  const todoWithDates3 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(now.getTime() + oneDayMs * 4).toISOString(),
        dueDate: new Date(now.getTime() + oneDayMs * 7).toISOString(),
      },
    },
  );
  typia.assert(todoWithDates3);
  // 3. Create 2 todos without start_date and due_date (NULL values)
  const todoNullDates1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: null,
        dueDate: null,
      },
    },
  );
  typia.assert(todoNullDates1);
  const todoNullDates2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: null,
        dueDate: null,
      },
    },
  );
  typia.assert(todoNullDates2);
  // Helper function to verify NULLS LAST ordering
  const verifyNullsLast = (
    todos: ITodoAppTodo.ISummary[],
    dateField: "start_date" | "due_date",
    order: "asc" | "desc",
  ): void => {
    const nullTodos: ITodoAppTodo.ISummary[] = [];
    const nonNullTodos: ITodoAppTodo.ISummary[] = [];
    for (const todo of todos) {
      if (todo[dateField] === null) {
        nullTodos.push(todo);
      } else {
        nonNullTodos.push(todo);
      }
    }
    // Verify NULLS LAST: all non-null come before nulls
    const firstNullIndex = todos.findIndex((todo) => todo[dateField] === null);
    if (nullTodos.length > 0) {
      TestValidator.predicate(
        `${dateField} ${order}: nulls at end`,
        firstNullIndex === nonNullTodos.length,
      );
    }
    // Verify non-null dates are properly sorted
    const dates = nonNullTodos.map((todo) =>
      new Date(todo[dateField]!).getTime(),
    );
    const isSorted =
      order === "asc"
        ? dates.every((val, i) => i === 0 || dates[i - 1] <= val)
        : dates.every((val, i) => i === 0 || dates[i - 1] >= val);
    TestValidator.predicate(
      `${dateField} ${order}: non-null dates sorted correctly`,
      isSorted,
    );
  };
  // Test Case 1: Sort by start_date ascending - NULL dates at end
  const startAscResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "start_date",
        sortOrder: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startAscResponse);
  verifyNullsLast(startAscResponse.data, "start_date", "asc");
  // Test Case 2: Sort by start_date descending - NULL dates at end
  const startDescResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "start_date",
        sortOrder: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDescResponse);
  verifyNullsLast(startDescResponse.data, "start_date", "desc");
  // Test Case 3: Sort by due_date ascending - NULL dates at end
  const dueAscResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "due_date",
        sortOrder: "asc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueAscResponse);
  verifyNullsLast(dueAscResponse.data, "due_date", "asc");
  // Test Case 4: Sort by due_date descending - NULL dates at end
  const dueDescResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "due_date",
        sortOrder: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDescResponse);
  verifyNullsLast(dueDescResponse.data, "due_date", "desc");
  // Test Case 5: Sort by created_at (default) - verify all todos returned
  const createdDescResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdDescResponse);
  // Verify we have all 5 todos in response
  TestValidator.equals(
    "all todos returned",
    createdDescResponse.data.length,
    5,
  );
  // Verify pagination info
  TestValidator.equals(
    "total records",
    createdDescResponse.pagination.records,
    5,
  );
}
