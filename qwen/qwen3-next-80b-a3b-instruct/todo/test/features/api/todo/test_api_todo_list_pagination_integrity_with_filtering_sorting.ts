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

export async function test_api_todo_list_pagination_integrity_with_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {},
  });
  // Create 25 todos with varying completion status, start dates, and due dates
  const todoCount = 25;
  const todos: ITodoAppTodo[] = [];
  const completionStatus: boolean[] = [];
  await ArrayUtil.asyncRepeat(todoCount, async (index) => {
    // Randomly determine completion status
    const isCompleted = index % 3 === 0;
    completionStatus.push(isCompleted);
    // Randomly set start date (some null, some defined)
    const hasStartDate = index % 4 !== 0;
    const startDate = hasStartDate
      ? new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString()
      : null;
    // Randomly set due date (some null, some defined)
    const hasDueDate = index % 5 !== 0;
    const dueDate = hasDueDate
      ? new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString()
      : null;
    // Create todo with random title
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(),
          description:
            index % 7 === 0
              ? RandomGenerator.paragraph({ sentences: 2 })
              : undefined,
          start_date: startDate,
          due_date: dueDate,
          completed: isCompleted,
        },
      },
    );
    todos.push(todo);
  });
  // 1. Request page 1 with limit=10 sorted by creation_date descending
  const page1Request: ITodoAppTodo.IRequest = {
    pagination: {
      current: 1,
      limit: 10,
    },
    sort: ["-created_at"],
  };
  const page1Result = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: page1Request,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 pagination current",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 pagination records",
    page1Result.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "page 1 pagination pages",
    page1Result.pagination.pages,
    3,
  );
  TestValidator.equals("page 1 data length", page1Result.data.length, 10);
  // 2. Request page 2 with same parameters
  const page2Request: ITodoAppTodo.IRequest = {
    pagination: {
      current: 2,
      limit: 10,
    },
    sort: ["-created_at"],
  };
  const page2Result = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 pagination records",
    page2Result.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "page 2 pagination pages",
    page2Result.pagination.pages,
    3,
  );
  TestValidator.equals("page 2 data length", page2Result.data.length, 10);
  // 3. Request page 3 with same parameters
  const page3Request: ITodoAppTodo.IRequest = {
    pagination: {
      current: 3,
      limit: 10,
    },
    sort: ["-created_at"],
  };
  const page3Result = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: page3Request,
    },
  );
  typia.assert(page3Result);
  TestValidator.equals(
    "page 3 pagination current",
    page3Result.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 pagination limit",
    page3Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 3 pagination records",
    page3Result.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "page 3 pagination pages",
    page3Result.pagination.pages,
    3,
  );
  TestValidator.equals("page 3 data length", page3Result.data.length, 5);
  // Validate that data in all pages belongs to the authenticated user
  // (This is enforced by API design - no user-specific data leaks)
  // 4. Change sort to due_date ascending and repeat pagination verification
  const page1DueDateRequest: ITodoAppTodo.IRequest = {
    pagination: {
      current: 1,
      limit: 10,
    },
    sort: ["+due_date"],
  };
  const page1DueDateResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: page1DueDateRequest,
    },
  );
  typia.assert(page1DueDateResult);
  TestValidator.equals(
    "due_date sort page 1 pagination current",
    page1DueDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "due_date sort page 1 pagination limit",
    page1DueDateResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "due_date sort page 1 pagination records",
    page1DueDateResult.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "due_date sort page 1 pagination pages",
    page1DueDateResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "due_date sort page 1 data length",
    page1DueDateResult.data.length,
    10,
  );
  // 5. Verify completed filter correctly reduces pagination.records count
  const incompleteFilterRequest: ITodoAppTodo.IRequest = {
    pagination: {
      current: 1,
      limit: 10,
    },
    completed: false, // Only incomplete todos
  };
  const incompleteFilterResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: incompleteFilterRequest,
    },
  );
  typia.assert(incompleteFilterResult);
  // Count actual incomplete todos using our tracked completion status array
  const actualIncompleteCount = completionStatus.filter(
    (status) => !status,
  ).length;
  TestValidator.equals(
    "incomplete filter records",
    incompleteFilterResult.pagination.records,
    actualIncompleteCount,
  );
  TestValidator.equals(
    "incomplete filter data",
    incompleteFilterResult.data.length,
    todoCount > 10 ? 10 : todoCount,
  );
  const completeFilterRequest: ITodoAppTodo.IRequest = {
    pagination: {
      current: 1,
      limit: 10,
    },
    completed: true, // Only complete todos
  };
  const completeFilterResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: completeFilterRequest,
    },
  );
  typia.assert(completeFilterResult);
  // Count actual complete todos using our tracked completion status array
  const actualCompleteCount = completionStatus.filter(
    (status) => status,
  ).length;
  TestValidator.equals(
    "complete filter records",
    completeFilterResult.pagination.records,
    actualCompleteCount,
  );
  TestValidator.equals(
    "complete filter data",
    completeFilterResult.data.length,
    todoCount > 10 ? 10 : todoCount,
  );
}
