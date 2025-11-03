import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoItem";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_items_index_pagination(
  connection: api.IConnection,
) {
  // Test pagination functionality for todo item retrieval with configurable page size.
  // This test validates that the API correctly handles pagination parameters (page and limit),
  // returns consistent pagination metadata, and delivers results in expected structure.
  // The test assumes the authenticated user has sufficient todo items (at least 10) in the system.
  // All assertions focus on response structure, not specific content, as test data is pre-existing.

  // 1. Test default parameters (empty body)
  const defaultPage: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {},
    });
  typia.assert(defaultPage);

  // Validate default pagination metadata - page=1, limit=25
  TestValidator.equals(
    "default page current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 25);
  TestValidator.predicate(
    "default page has records",
    () => defaultPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "default page has items",
    () => defaultPage.data.length > 0,
  );

  // 2. Test limit equals 1 (minimum limit - edge case)
  const minLimit: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        limit: 1,
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(minLimit);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimit.pagination.limit,
    1,
  );
  TestValidator.equals(
    "minimum limit returns exactly 1 item",
    minLimit.data.length,
    1,
  );

  // 3. Test limit equals 100 (maximum limit - edge case)
  const maxLimit: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        limit: 100,
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(maxLimit);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit returns all items",
    () => maxLimit.data.length === maxLimit.pagination.records,
  );

  // 4. Test page=1 with limit=10 (standard pagination)
  const firstPage: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page item count", firstPage.data.length, 10);

  // 5. Test page=2 with limit=10 (second page)
  const secondPage: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals("second page item count", secondPage.data.length, 10);

  // 6. Test page=999 (non-existent page - should return empty data but correct pagination metadata)
  const nonExistentPage: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        page: 999,
        limit: 10,
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(nonExistentPage);
  TestValidator.equals(
    "non-existent page current page",
    nonExistentPage.pagination.current,
    999,
  );
  TestValidator.equals(
    "non-existent page limit",
    nonExistentPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "non-existent page item count",
    nonExistentPage.data.length,
    0,
  );

  // 7. Validate item structure in response - each item should have id, text, status
  const sampleItem = firstPage.data[0];
  TestValidator.predicate(
    "item has id",
    () => sampleItem && typia.is<string & tags.Format<"uuid">>(sampleItem.id),
  );
  TestValidator.predicate(
    "item has text",
    () =>
      sampleItem &&
      typeof sampleItem.text === "string" &&
      sampleItem.text.length > 0,
  );
  TestValidator.predicate(
    "item has valid status",
    () =>
      sampleItem &&
      (sampleItem.status === "pending" || sampleItem.status === "completed"),
  );

  // 8. Test status parameter - 'pending'
  const pendingFilter: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        status: "pending" as "pending" | "completed" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(pendingFilter);
  TestValidator.predicate(
    "pending filter returns at least one item",
    () => pendingFilter.data.length > 0,
  );

  // 9. Test status parameter - 'completed'
  const completedFilter: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        status: "completed" as "pending" | "completed" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(completedFilter);
  TestValidator.predicate(
    "completed filter returns at least one item",
    () => completedFilter.data.length > 0,
  );

  // 10. Test status parameter - 'null' string literal
  const nullStatus: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        status: "null" as "pending" | "completed" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(nullStatus);
  TestValidator.predicate(
    "null status filter returns items",
    () => nullStatus.data.length > 0,
  );

  // 11. Test sort_by parameter - 'created_at'
  const sortByCreated: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        sort_by: "created_at" as "created_at" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(sortByCreated);
  TestValidator.predicate(
    "created_at sort returns items",
    () => sortByCreated.data.length > 0,
  );

  // 12. Test order parameter - 'desc'
  const descOrder: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        order: "desc" as "desc" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(descOrder);
  TestValidator.predicate(
    "desc order returns items",
    () => descOrder.data.length > 0,
  );

  // 13. Test order parameter - 'null' string literal
  const nullOrder: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        order: "null" as "desc" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(nullOrder);
  TestValidator.predicate(
    "null order returns items",
    () => nullOrder.data.length > 0,
  );

  // 14. Test complexity: combine all parameters
  const complexFilter: IPageITodoItem.ISummary =
    await api.functional.todo.user.todoItems.index(connection, {
      body: {
        page: 1,
        limit: 5,
        status: "pending" as "pending" | "completed" | "null",
        sort_by: "created_at" as "created_at" | "null",
        order: "desc" as "desc" | "null",
      } satisfies ITodoItem.IRequest,
    });
  typia.assert(complexFilter);
  TestValidator.equals(
    "complex filter page",
    complexFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "complex filter limit",
    complexFilter.pagination.limit,
    5,
  );
  TestValidator.equals(
    "complex filter items count",
    complexFilter.data.length,
    5,
  );
  TestValidator.predicate(
    "complex filter has items",
    () => complexFilter.data.length > 0,
  );
}
