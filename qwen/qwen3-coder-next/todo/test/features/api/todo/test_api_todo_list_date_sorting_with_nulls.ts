import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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

export async function test_api_todo_list_date_sorting_with_nulls(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user for authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create todos with various date configurations for comprehensive testing
  // Todo 1: No dates set
  const todo1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "No dates todo",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // Todo 2: Only start date
  const todo2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Only start date todo",
        startDate: new Date("2024-01-15T10:00:00Z").toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Todo 3: Only due date
  const todo3 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Only due date todo",
        dueDate: new Date("2024-01-20T15:30:00Z").toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // Todo 4: Both start and due dates (earlier than todo2)
  const todo4 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Both dates todo (earlier)",
        startDate: new Date("2024-01-10T08:00:00Z").toISOString(),
        dueDate: new Date("2024-01-18T12:00:00Z").toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);
  // Todo 5: Both dates (later than todo2)
  const todo5 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Both dates todo (later)",
        startDate: new Date("2024-01-25T14:00:00Z").toISOString(),
        dueDate: new Date("2024-02-01T16:00:00Z").toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);
  // Todo 6: No dates set (for stable sort verification)
  const todo6 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "No dates todo 2",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo6);
  // 3. Test sorting by start_date ascending (nulls last)
  const startDateAscResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [{ field: "start_date", direction: "asc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateAscResult);
  // Validate sorting order for start_date ascending: earlier dates first, then nulls
  const startDateAscIds = startDateAscResult.data.map((todo) => todo.id);
  const expectedStartDateAscOrder = [
    todo4.id,
    todo2.id,
    todo5.id,
    todo1.id,
    todo6.id,
    todo3.id,
  ];
  TestValidator.equals(
    "start_date ascending order",
    startDateAscIds,
    expectedStartDateAscOrder,
  );
  // 4. Test sorting by start_date descending (nulls first for descending)
  const startDateDescResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [{ field: "start_date", direction: "desc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(startDateDescResult);
  const startDateDescIds = startDateDescResult.data.map((todo) => todo.id);
  const expectedStartDateDescOrder = [
    todo5.id,
    todo2.id,
    todo4.id,
    todo1.id,
    todo6.id,
    todo3.id,
  ];
  TestValidator.equals(
    "start_date descending order",
    startDateDescIds,
    expectedStartDateDescOrder,
  );
  // 5. Test sorting by due_date ascending (nulls last)
  const dueDateAscResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [{ field: "due_date", direction: "asc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateAscResult);
  const dueDateAscIds = dueDateAscResult.data.map((todo) => todo.id);
  const expectedDueDateAscOrder = [
    todo4.id,
    todo3.id,
    todo5.id,
    todo1.id,
    todo6.id,
    todo2.id,
  ];
  TestValidator.equals(
    "due_date ascending order",
    dueDateAscIds,
    expectedDueDateAscOrder,
  );
  // 6. Test sorting by due_date descending (nulls first for descending)
  const dueDateDescResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [{ field: "due_date", direction: "desc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dueDateDescResult);
  const dueDateDescIds = dueDateDescResult.data.map((todo) => todo.id);
  const expectedDueDateDescOrder = [
    todo5.id,
    todo3.id,
    todo4.id,
    todo1.id,
    todo6.id,
    todo2.id,
  ];
  TestValidator.equals(
    "due_date descending order",
    dueDateDescIds,
    expectedDueDateDescOrder,
  );
  // 7. Test stable sorting with identical values
  // Create todos with identical start dates to verify stable sort
  const stableDate = new Date("2024-03-01T10:00:00Z").toISOString();
  const stableTodo1 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Stable sort todo 1",
        startDate: stableDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(stableTodo1);
  const stableTodo2 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Stable sort todo 2",
        startDate: stableDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(stableTodo2);
  const stableTodo3 = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Stable sort todo 3",
        startDate: stableDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(stableTodo3);
  // Verify stable sorting maintains original order for identical values
  const stableSortResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [{ field: "start_date", direction: "asc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(stableSortResult);
  // All stable todos should be grouped together in stable sort
  const stableTodos = stableSortResult.data.filter((todo) =>
    [stableTodo1.id, stableTodo2.id, stableTodo3.id].includes(todo.id),
  );
  TestValidator.equals("stable todos count", stableTodos.length, 3);
  // Verify that all todos are sorted correctly by checking if each todo appears in the result
  const allTodos = [
    todo1,
    todo2,
    todo3,
    todo4,
    todo5,
    todo6,
    stableTodo1,
    stableTodo2,
    stableTodo3,
  ];
  const allTodoIds = allTodos.map((t) => t.id);
  const resultIds = stableSortResult.data.map((t) => t.id);
  allTodoIds.forEach((id) => {
    TestValidator.predicate("todo in result", resultIds.includes(id));
  });
  // 8. Test combined sorting (start_date asc, due_date desc)
  const combinedSortResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [
          { field: "start_date", direction: "asc" },
          { field: "due_date", direction: "desc" },
        ],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedSortResult);
  // Verify combined sorting produces expected results
  const combinedIds = combinedSortResult.data.map((todo) => todo.id);
  const allIds = [
    todo1.id,
    todo2.id,
    todo3.id,
    todo4.id,
    todo5.id,
    todo6.id,
    stableTodo1.id,
    stableTodo2.id,
    stableTodo3.id,
  ];
  allIds.forEach((id) => {
    TestValidator.predicate(
      "todo in combined result",
      combinedIds.includes(id),
    );
  });
  // 9. Test sorting with pagination to ensure sorting persists across pages
  const paginatedResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortFields: [{ field: "start_date", direction: "asc" }],
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Verify pagination respects sorting
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 5,
  );
  TestValidator.equals(
    "pagination total count",
    paginatedResult.pagination.records,
    9,
  );
  TestValidator.predicate(
    "pagination has correct page",
    paginatedResult.pagination.current === 1,
  );
  // 10. Test sorting with status filter
  const incompleteResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "incomplete",
        sortFields: [{ field: "start_date", direction: "asc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResult);
  // All todos should be incomplete by default
  incompleteResult.data.forEach((todo) => {
    TestValidator.equals("all todos incomplete", todo.is_complete, false);
  });
  // Verify sorting is applied correctly with status filter
  const incompleteIds = incompleteResult.data.map((todo) => todo.id);
  const expectedIncompleteOrder = [
    todo4.id,
    todo2.id,
    todo5.id,
    todo1.id,
    todo6.id,
    todo3.id,
  ];
  TestValidator.equals(
    "incomplete status sorted order",
    incompleteIds,
    expectedIncompleteOrder,
  );
}
