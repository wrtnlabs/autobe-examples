import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoItem";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test to verify retrieval of a filtered and paginated list of todo items for
 * an authenticated user.
 *
 * The test consists of the following steps:
 *
 * 1. Register a new user via /auth/user/join to establish authentication.
 * 2. Create multiple todo items for the authenticated user, varying status and due
 *    dates.
 * 3. Query the todo items list with filters for status and due date range,
 *    including pagination parameters.
 * 4. Validate that the response contains only todo items for the authenticated
 *    user, matching filter criteria.
 * 5. Validate pagination metadata matches the expected counts based on created
 *    items.
 *
 * This test ensures data isolation by user, correctness of filtering, and
 * accurate pagination implementation.
 */
export async function test_api_todo_user_todo_items_index_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "P@ssw0rd!",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create multiple todo items for the authenticated user
  const todoItemsToCreate: ITodoItem.ICreate[] = [
    {
      description: "Task pending urgent",
      status: "pending",
      due_date: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      description: "Task pending later",
      status: "pending",
      due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    },
    {
      description: "Completed task yesterday",
      status: "completed",
      due_date: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      description: "Completed task tomorrow",
      status: "completed",
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    },
    {
      description: "Pending task no due date",
      status: "pending",
      due_date: null,
    },
  ];

  const createdTodoItems: ITodoItem[] = [];
  for (const item of todoItemsToCreate) {
    const created = await api.functional.todo.user.todoItems.create(
      connection,
      { body: item },
    );
    typia.assert(created);
    createdTodoItems.push(created);
  }

  // 3. Query the todo items list with filters and pagination
  const filterStatus: "pending" | "completed" = "pending";
  const filterDueDateFrom = new Date(
    Date.now() + 86400000 - 3600000,
  ).toISOString(); // slightly before 1 day ahead
  const filterDueDateTo = new Date(
    Date.now() + 86400000 * 3 + 3600000,
  ).toISOString(); // slightly after 3 days ahead

  const page = 1;
  const pageSize = 2;

  const response: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        status: filterStatus,
        due_date_from: filterDueDateFrom,
        due_date_to: filterDueDateTo,
        page: page,
        page_size: pageSize,
        sort_by: "due_date",
        sort_order: "asc",
        description: undefined,
      } satisfies ITodoItem.IRequest,
    });

  typia.assert(response);

  // 4. Validate filtered results
  const filteredExpectedItems = createdTodoItems.filter((item) => {
    if (item.status !== filterStatus) return false;
    if (item.due_date === null || item.due_date === undefined) return false;
    return (
      item.due_date >= filterDueDateFrom && item.due_date <= filterDueDateTo
    );
  });

  // Validate pagination info
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit page size",
    response.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    filteredExpectedItems.length,
  );
  TestValidator.equals(
    "pagination total pages",
    response.pagination.pages,
    Math.ceil(filteredExpectedItems.length / pageSize),
  );

  // Validate data length (should be <= page size)
  TestValidator.predicate(
    "response data length less or equal to page size",
    response.data.length <= pageSize,
  );

  // Validate all returned items match filter
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.equals("item status match", item.status, filterStatus);
    if (item.due_date !== null && item.due_date !== undefined) {
      TestValidator.predicate(
        "item due_date within filter range",
        item.due_date >= filterDueDateFrom && item.due_date <= filterDueDateTo,
      );
    }
  }

  // Validate no duplicates in returned data
  const uniqueIds = new Set<string>();
  for (const item of response.data) {
    TestValidator.predicate("no duplicate todo item", !uniqueIds.has(item.id));
    uniqueIds.add(item.id);
  }
}
