import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test todo list retrieval with filtering and sorting capabilities.
 *
 * This test validates the todo list retrieval endpoint's ability to:
 * 1. Filter todos by completion status (all, complete, incomplete)
 * 2. Sort todos by various date fields (createdAt, startDate, dueDate)
 * 3. Handle pagination correctly
 * 4. Properly handle todos without date fields when sorting by date
 * 5. Return correct pagination metadata
 */
export async function test_api_todo_list_retrieval_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple todos with different dates for filtering and sorting tests
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 5).toISOString(); // 5 days ago
  const futureDate = new Date(now.getTime() + 86400000 * 10).toISOString(); // 10 days from now
  const nearFutureDate = new Date(now.getTime() + 86400000 * 2).toISOString(); // 2 days from now
  // Create todo with start and due dates
  const todoWithDates = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Task with start and due dates",
        description: "This is a todo with both dates",
        startDate: pastDate,
        dueDate: nearFutureDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithDates);
  // Create todo with only start date
  const todoWithStart = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Task with start date only",
        description: "This todo has only start date",
        startDate: pastDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithStart);
  // Create todo with only due date
  const todoWithDue = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Task with due date only",
        description: "This todo has only due date",
        dueDate: futureDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithDue);
  // Create todo without any dates
  const todoNoDates = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Task without dates",
        description: "This todo has no dates",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoNoDates);
  // Create another todo without dates for pagination testing
  const todoNoDates2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Another task without dates",
        description: "This is another todo without dates",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoNoDates2);
  // 3. Test retrieving all todos with default parameters
  const allTodosResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodosResponse);
  TestValidator.equals(
    "total todos count",
    allTodosResponse.pagination.records,
    5,
  );
  TestValidator.equals("current page", allTodosResponse.pagination.current, 1);
  TestValidator.equals("limit", allTodosResponse.pagination.limit, 10);
  TestValidator.predicate("has todos", allTodosResponse.data.length > 0);
  // 4. Test filtering by complete status (should return 0 since all are incomplete)
  const completedTodosResponse =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completed: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completedTodosResponse);
  TestValidator.equals(
    "completed todos count",
    completedTodosResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "completed todos data length",
    completedTodosResponse.data.length,
    0,
  );
  // 5. Test filtering by incomplete status (should return all 5)
  const incompleteTodosResponse =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completed: "incomplete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteTodosResponse);
  TestValidator.equals(
    "incomplete todos count",
    incompleteTodosResponse.pagination.records,
    5,
  );
  TestValidator.predicate("all incomplete are not complete", () =>
    incompleteTodosResponse.data.every((todo) => todo.completed === false),
  );
  // 6. Test sorting by createdAt (descending - newest first)
  const sortByCreatedAtDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByCreatedAtDesc);
  // Verify todos are sorted by createdAt descending
  for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
    TestValidator.predicate(
      `createdAt at index ${i} >= createdAt at index ${i + 1}`,
      sortByCreatedAtDesc.data[i].created_at >=
        sortByCreatedAtDesc.data[i + 1].created_at,
    );
  }
  // 7. Test sorting by startDate (ascending - earliest first)
  // Todos without startDate should appear at the end
  const sortByStartDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "startDate",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByStartDateAsc);
  // Find todos with and without start dates
  const todosWithStartDate = sortByStartDateAsc.data.filter(
    (todo) => todo.start_date !== null && todo.start_date !== undefined,
  );
  const todosWithoutStartDate = sortByStartDateAsc.data.filter(
    (todo) => todo.start_date === null || todo.start_date === undefined,
  );
  // Verify todos with startDate come before todos without startDate
  if (todosWithStartDate.length > 0 && todosWithoutStartDate.length > 0) {
    const lastWithStartDateIndex =
      sortByStartDateAsc.data.length - todosWithoutStartDate.length - 1;
    TestValidator.predicate(
      "todos with startDate come before todos without",
      lastWithStartDateIndex >= 0 &&
        todosWithStartDate.length === lastWithStartDateIndex + 1,
    );
  }
  // 8. Test sorting by dueDate (descending - latest first)
  const sortByDueDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sortBy: "dueDate",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortByDueDateDesc);
  // Verify todos with dueDate are sorted correctly
  const todosWithDueDate = sortByDueDateDesc.data.filter(
    (todo) => todo.due_date !== null && todo.due_date !== undefined,
  );
  for (let i = 0; i < todosWithDueDate.length - 1; i++) {
    TestValidator.predicate(
      `dueDate at index ${i} >= dueDate at index ${i + 1}`,
      todosWithDueDate[i].due_date! >= todosWithDueDate[i + 1].due_date!,
    );
  }
  // 9. Test pagination with limit=2
  const paginationTest = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "all",
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.equals("page 1 records count", paginationTest.data.length, 2);
  TestValidator.equals(
    "pagination records total",
    paginationTest.pagination.records,
    5,
  );
  TestValidator.equals("pagination pages", paginationTest.pagination.pages, 3); // ceil(5/2) = 3
  // 10. Test pagination page 2
  const paginationPage2 = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "all",
        page: 2,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginationPage2);
  TestValidator.equals("page 2 current", paginationPage2.pagination.current, 2);
  TestValidator.predicate(
    "page 2 has records",
    paginationPage2.data.length > 0,
  );
  TestValidator.predicate(
    "page 2 has max 2 records",
    paginationPage2.data.length <= 2,
  );
  // 11. Test combined filtering and sorting
  const combinedFilterSort = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "incomplete",
        sortBy: "createdAt",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedFilterSort);
  TestValidator.equals(
    "incomplete count with sorting",
    combinedFilterSort.pagination.records,
    5,
  );
  TestValidator.predicate("all are incomplete", () =>
    combinedFilterSort.data.every((todo) => todo.completed === false),
  );
  // 12. Verify response structure
  const sampleTodo = allTodosResponse.data[0];
  TestValidator.predicate("todo has id", sampleTodo.id !== undefined);
  TestValidator.predicate(
    "todo has title",
    sampleTodo.title !== undefined && sampleTodo.title.length > 0,
  );
  TestValidator.predicate(
    "todo has completed",
    sampleTodo.completed !== undefined,
  );
  TestValidator.predicate(
    "todo has created_at",
    sampleTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "todo has updated_at",
    sampleTodo.updated_at !== undefined,
  );
}
