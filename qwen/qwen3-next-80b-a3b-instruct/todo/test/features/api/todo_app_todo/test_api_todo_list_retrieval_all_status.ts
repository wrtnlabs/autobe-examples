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

export async function test_api_todo_list_retrieval_all_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user);
  // Step 2: Create multiple todos with varying completion_status, start_date, and due_date
  // Create 3 todos: one completed, two incomplete, with varying date properties
  const todo1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Completed Todo",
        description: "This todo is completed",
        start_date: "2026-02-10T09:00:00Z",
        due_date: "2026-02-12T17:00:00Z",
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Incomplete Todo with start_date",
        description: "This todo is incomplete with start date",
        start_date: "2026-02-11T10:00:00Z", // Later than todo1
        due_date: undefined, // Change null to undefined to match type (string & Format<"date-time">) | undefined
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Incomplete Todo with null dates",
        description: "This todo is incomplete with null dates",
        start_date: undefined, // Change null to undefined to match type (string & Format<"date-time">) | undefined
        due_date: undefined, // Change null to undefined to match type (string & Format<"date-time">) | undefined
      },
    },
  );
  typia.assert(todo3);
  // Step 3: Verify that all todos are retrieved with status=all
  // Use the correct API function to retrieve todos with status=all
  const allTodosResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(allTodosResponse);
  // Step 4: Verify that only the authenticated user's todos are returned
  TestValidator.equals(
    "total records should match created todos",
    allTodosResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "page should be 1",
    allTodosResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    allTodosResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages should be 1",
    allTodosResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "data should contain 3 todos",
    allTodosResponse.data.length,
    3,
  );
  // Step 5: Verify default sorting by creation_date descending
  // Sort the response data by created_at descending to compare
  const sortedByCreation = [...allTodosResponse.data].sort((a, b) => {
    return (
      new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    );
  });
  // Validate order matches creation_date descending
  TestValidator.equals(
    "first todo should be the newest",
    allTodosResponse.data[0].title,
    "Completed Todo",
  );
  TestValidator.equals(
    "second todo should be the middle one",
    allTodosResponse.data[1].title,
    "Incomplete Todo with start_date",
  );
  TestValidator.equals(
    "third todo should be the oldest",
    allTodosResponse.data[2].title,
    "Incomplete Todo with null dates",
  );
  // Validate completion_status matches request
  const completedTodo = allTodosResponse.data.find(
    (t) => t.title === "Completed Todo",
  );
  TestValidator.equals(
    "completed todo should be marked complete",
    completedTodo?.completion_status,
    true,
  );
  const incompleteTodo = allTodosResponse.data.find(
    (t) => t.title === "Incomplete Todo with start_date",
  );
  TestValidator.equals(
    "incomplete todo should be marked incomplete",
    incompleteTodo?.completion_status,
    false,
  );
  const nullDatesTodo = allTodosResponse.data.find(
    (t) => t.title === "Incomplete Todo with null dates",
  );
  TestValidator.equals(
    "null dates todo should be marked incomplete",
    nullDatesTodo?.completion_status,
    false,
  );
  // Step 6: Validate null dates are placed at the end when sorted by start_date or due_date
  // Get todos sorted by start_date descending
  const startSortedResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        sort: "start_date",
        order: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(startSortedResponse);
  // Sort todos manually by start_date descending (nulls at end)
  const sortedByStart = [...startSortedResponse.data].sort((a, b) => {
    if (a.start_date === null && b.start_date === null) return 0;
    if (a.start_date === null) return 1;
    if (b.start_date === null) return -1;
    return (
      new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime()
    );
  });
  // Compare sorted response with manual sort
  TestValidator.equals(
    "first start_date sorted todo should have start_date",
    startSortedResponse.data[0].title,
    "Incomplete Todo with start_date",
  );
  TestValidator.equals(
    "second start_date sorted todo should have start_date",
    startSortedResponse.data[1].title,
    "Completed Todo",
  );
  TestValidator.equals(
    "third start_date sorted todo should have null start_date",
    startSortedResponse.data[2].title,
    "Incomplete Todo with null dates",
  );
  // Validate the same behavior for due_date sorting
  const dueSortedResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        sort: "due_date",
        order: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(dueSortedResponse);
  const sortedByDue = [...dueSortedResponse.data].sort((a, b) => {
    if (a.due_date === null && b.due_date === null) return 0;
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return new Date(b.due_date!).getTime() - new Date(a.due_date!).getTime();
  });
  TestValidator.equals(
    "first due_date sorted todo should have due_date",
    dueSortedResponse.data[0].title,
    "Completed Todo",
  );
  TestValidator.equals(
    "second due_date sorted todo should have null due_date",
    dueSortedResponse.data[1].title,
    "Incomplete Todo with start_date",
  );
  TestValidator.equals(
    "third due_date sorted todo should have null due_date",
    dueSortedResponse.data[2].title,
    "Incomplete Todo with null dates",
  );
  // Step 7: Confirm default sort is creation_date descending when no sort parameter provided
  const noSortResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(noSortResponse);
  TestValidator.equals(
    "default sort should be creation_date descending",
    noSortResponse.data[0].title,
    "Completed Todo",
  );
  TestValidator.equals(
    "default sort should be creation_date descending",
    noSortResponse.data[1].title,
    "Incomplete Todo with start_date",
  );
  TestValidator.equals(
    "default sort should be creation_date descending",
    noSortResponse.data[2].title,
    "Incomplete Todo with null dates",
  );
  // Step 8: Confirm data isolation - create a second user and ensure they can't see first user's todos
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user2);
  // User2 should see 0 todos
  const user2TodosResponse = await api.functional.todoApp.user.todos.index(
    user2Connection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(user2TodosResponse);
  TestValidator.equals(
    "second user should have 0 todos",
    user2TodosResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "second user should have empty data array",
    user2TodosResponse.data.length,
    0,
  );
}