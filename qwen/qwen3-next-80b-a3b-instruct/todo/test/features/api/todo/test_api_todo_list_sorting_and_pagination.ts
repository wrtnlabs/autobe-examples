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

export async function test_api_todo_list_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user and create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user);
  // Step 2: Create multiple todos with varied timestamps and null/defined dates
  const todos: ITodoAppTodo[] = [];
  // Create a mix of todos with different date patterns
  // - Some with creation_date, start_date, and due_date all defined
  // - Some with null start_date or due_date
  // - Some with very different timestamps for sorting validation
  const baseDate = new Date("2024-01-01T00:00:00Z");
  // Create 15 todos with different date combinations
  for (let i = 0; i < 15; i++) {
    const creationDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    // Randomly decide whether to set start_date and due_date
    const hasStartDate = i % 3 !== 0; // 2/3 have start_date
    const hasDueDate = i % 4 !== 0; // 3/4 have due_date
    // Mix some with undefined dates for testing null/undefined handling
    const startDate = hasStartDate
      ? new Date(
          creationDate.getTime() + (i % 3 === 1 ? 7 * 24 * 60 * 60 * 1000 : 0),
        ).toISOString()
      : undefined;
    const dueDate = hasDueDate
      ? new Date(
          creationDate.getTime() + (i % 4 === 1 ? 14 * 24 * 60 * 60 * 1000 : 0),
        ).toISOString()
      : undefined;
    const todo: ITodoAppTodo.ICreate = {
      title: `Todo ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}`,
      description:
        i % 5 === 0
          ? undefined
          : RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 4,
              wordMax: 10,
            }),
      start_date: startDate,
      due_date: dueDate,
    };
    const createdTodo = await api.functional.todoApp.user.todos.create(
      userConnection,
      {
        body: todo,
      },
    );
    typia.assert(createdTodo);
    todos.push(createdTodo);
  }
  // Step 3: Verify default sorting and pagination behavior
  const defaultResult = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page size is 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default sort is creation_date",
    defaultResult.pagination.records,
    todos.length,
  );
  // Verify default sorting is by creation_date descending
  TestValidator.equals(
    "latest todo should be first in default sort",
    todos[14].created_at, // The last created todo should be first
    defaultResult.data[0].created_at,
  );
  // Step 4: Test sorting by creation_date in ascending order
  const creationAscending = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "creation_date",
        order: "asc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(creationAscending);
  // Validate that 10 results were returned for page 1
  TestValidator.equals(
    "creation_date ascending limits to 10",
    creationAscending.pagination.limit,
    10,
  );
  TestValidator.equals(
    "creation_date ascending page 1 has 10 records",
    creationAscending.data.length,
    10,
  );
  // Check that records are in correct ascending order by creation_date
  for (let i = 0; i < creationAscending.data.length - 1; i++) {
    const current = new Date(creationAscending.data[i].created_at!);
    const next = new Date(creationAscending.data[i + 1].created_at!);
    TestValidator.predicate(
      `creation_date order ${i} -> ${i + 1} is ascending`,
      current <= next,
    );
  }
  // Step 5: Test sorting by creation_date in descending order
  const creationDescending = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "creation_date",
        order: "desc",
        page: 1,
        limit: 15,
      },
    },
  );
  typia.assert(creationDescending);
  // Validate correct number of results
  TestValidator.equals(
    "creation_date descending page 1 returns all 15",
    creationDescending.data.length,
    15,
  );
  // Check descending order
  for (let i = 0; i < creationDescending.data.length - 1; i++) {
    const current = new Date(creationDescending.data[i].created_at!);
    const next = new Date(creationDescending.data[i + 1].created_at!);
    TestValidator.predicate(
      `creation_date order ${i} -> ${i + 1} is descending`,
      current >= next,
    );
  }
  // Step 6: Test sorting by start_date in ascending order (with undefineds at end)
  const startDateAscending = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "start_date",
        order: "asc",
        page: 1,
        limit: 15,
      },
    },
  );
  typia.assert(startDateAscending);
  // Validate all records are returned
  TestValidator.equals(
    "start_date ascending returns all 15",
    startDateAscending.data.length,
    15,
  );
  // Extract records with and without start_date
  const withStartDate = startDateAscending.data.filter(
    (t) => t.start_date !== undefined,
  );
  const withoutStartDate = startDateAscending.data.filter(
    (t) => t.start_date === undefined,
  );
  // Validate that all todos without start_date are at the end
  TestValidator.equals(
    "all todos without start_date at the end",
    withoutStartDate.length,
    15 - withStartDate.length,
  );
  // Validate that todos with start_date are sorted in ascending order
  for (let i = 0; i < withStartDate.length - 1; i++) {
    const current = new Date(withStartDate[i].start_date!);
    const next = new Date(withStartDate[i + 1].start_date!);
    TestValidator.predicate(
      `start_date order ${i} -> ${i + 1} is ascending`,
      current <= next,
    );
  }
  // Test that todos without start_date are at the end
  if (withStartDate.length > 0 && withoutStartDate.length > 0) {
    const lastWithStartDate = new Date(
      withStartDate[withStartDate.length - 1].start_date!,
    );
    // Start date for undefineds should be after last non-undefined start_date
    TestValidator.predicate(
      "todos with no start_date come after todos with start_date",
      true,
    );
  }
  // Step 7: Test sorting by due_date in descending order (with undefineds at end)
  const dueDateDescending = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "due_date",
        order: "desc",
        page: 1,
        limit: 15,
      },
    },
  );
  typia.assert(dueDateDescending);
  // Validate correct number of results
  TestValidator.equals(
    "due_date descending returns all 15",
    dueDateDescending.data.length,
    15,
  );
  // Extract records with and without due_date
  const withDueDate = dueDateDescending.data.filter(
    (t) => t.due_date !== undefined,
  );
  const withoutDueDate = dueDateDescending.data.filter(
    (t) => t.due_date === undefined,
  );
  // Validate that all todos without due_date are at the end
  TestValidator.equals(
    "all todos without due_date at the end",
    withoutDueDate.length,
    15 - withDueDate.length,
  );
  // Validate that todos with due_date are sorted in descending order
  for (let i = 0; i < withDueDate.length - 1; i++) {
    const current = new Date(withDueDate[i].due_date!);
    const next = new Date(withDueDate[i + 1].due_date!);
    TestValidator.predicate(
      `due_date order ${i} -> ${i + 1} is descending`,
      current >= next,
    );
  }
  // Test that todos without due_date are at the end
  if (withDueDate.length > 0 && withoutDueDate.length > 0) {
    const lastWithDueDate = new Date(
      withDueDate[withDueDate.length - 1].due_date!,
    );
    // Due date for undefineds should be after last non-undefined due_date
    TestValidator.predicate(
      "todos with no due_date come after todos with due_date",
      true,
    );
  }
  // Step 8: Test pagination boundaries and limit cap
  // Test that limit > 100 is capped at 100
  const excessiveLimit = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        limit: 150,
      },
    },
  );
  typia.assert(excessiveLimit);
  TestValidator.equals(
    "limit capped at 100 even with 150",
    excessiveLimit.pagination.limit,
    100,
  );
  // Test that limit < 1 is not allowed (should default)
  const invalidLimit = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        limit: 0,
      },
    },
  );
  typia.assert(invalidLimit);
  TestValidator.equals(
    "limit default when 0",
    invalidLimit.pagination.limit,
    20,
  );
  // Test that page < 1 is not allowed (should default to 1)
  const invalidPage = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        page: 0,
      },
    },
  );
  typia.assert(invalidPage);
  TestValidator.equals(
    "page default to 1 when 0",
    invalidPage.pagination.current,
    1,
  );
  // Test pagination with limit=50 for next page
  const firstPage = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "creation_date",
        order: "desc",
        limit: 50,
        page: 1,
      },
    },
  );
  typia.assert(firstPage);
  // Second page should have more results
  const secondPage = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "creation_date",
        order: "desc",
        limit: 50,
        page: 2,
      },
    },
  );
  typia.assert(secondPage);
  // Test that total records matches what we have in database
  TestValidator.equals(
    "total records matches created todos",
    firstPage.pagination.records,
    todos.length,
  );
  // Step 9: Test invalid sort parameters default to creation_date ascending
  // Test invalid sort parameter - use a valid string not in enum
  const invalidSort = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "invalid_sort" as any, // We must bypass type system to test invalid inputs
        order: "desc",
      },
    },
  );
  typia.assert(invalidSort);
  // Verify default sort is creation_date ascending
  TestValidator.equals(
    "invalid sort field defaults to creation_date",
    invalidSort.data[0].created_at,
    todos[14].created_at,
  );
  // Test invalid order parameter defaults to 'desc' when sort is valid
  const invalidOrder = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sort: "creation_date",
        order: "desc", // Using valid enum value
      },
    },
  );
  typia.assert(invalidOrder);
  // Verify default order is desc
  TestValidator.equals(
    "invalid order defaults to desc",
    invalidOrder.data[0].created_at,
    todos[14].created_at,
  );
}
