import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoPriority";
import type { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";

/**
 * Test search functionality for todo priorities with pagination parameters.
 *
 * This test validates that the API endpoint returns filtered results based on
 * search criteria, proper pagination metadata, and handles various filter
 * combinations including active status and sorting options. It verifies that
 * response includes correct page information and data structure.
 */
export async function test_api_todo_priority_search_pagination(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppTodoPriority.IRequest;

  const basicResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: basicRequest,
    });
  typia.assert(basicResponse);

  TestValidator.equals(
    "pagination object exists",
    typeof basicResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    basicResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    basicResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    basicResponse.pagination.pages >= 0,
  );

  // Validate pagination calculations
  if (basicResponse.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      basicResponse.pagination.records / basicResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records/limit",
      basicResponse.pagination.pages,
      expectedPages,
    );
  }

  // Test 2: Search by priority code/name
  const searchRequest = {
    page: 1,
    limit: 5,
    search: "high",
  } satisfies ITodoAppTodoPriority.IRequest;

  const searchResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResponse);

  // Test 3: Active status filtering
  const activeRequest = {
    page: 1,
    limit: 10,
    is_active: true,
  } satisfies ITodoAppTodoPriority.IRequest;

  const activeResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: activeRequest,
    });
  typia.assert(activeResponse);

  // Test 4: Sorting by weight in ascending order
  const sortAscRequest = {
    page: 1,
    limit: 10,
    order_by: "weight",
    order_direction: "asc",
  } satisfies ITodoAppTodoPriority.IRequest;

  const sortAscResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: sortAscRequest,
    });
  typia.assert(sortAscResponse);

  // Test 5: Sorting by created_at in descending order
  const sortDescRequest = {
    page: 1,
    limit: 10,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppTodoPriority.IRequest;

  const sortDescResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: sortDescRequest,
    });
  typia.assert(sortDescResponse);

  // Test 6: Combination of multiple filters
  const combinedRequest = {
    page: 1,
    limit: 5,
    search: "urgent",
    is_active: true,
    order_by: "weight",
    order_direction: "desc",
  } satisfies ITodoAppTodoPriority.IRequest;

  const combinedResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: combinedRequest,
    });
  typia.assert(combinedResponse);

  // Test 7: Random parameter combinations
  const randomRequest = typia.random<ITodoAppTodoPriority.IRequest>();
  const randomResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: randomRequest,
    });
  typia.assert(randomResponse);

  // Test 8: Edge case - page beyond total pages
  const highPageRequest = {
    page: 1000,
    limit: 10,
  } satisfies ITodoAppTodoPriority.IRequest;

  const highPageResponse: IPageITodoAppTodoPriority.ISummary =
    await api.functional.todoApp.todos.priorities.index(connection, {
      body: highPageRequest,
    });
  typia.assert(highPageResponse);

  // Validate data structure for responses with data
  if (basicResponse.data.length > 0) {
    const priority = basicResponse.data[0];
    TestValidator.predicate(
      "priority has UUID id",
      typeof priority.id === "string" && priority.id.length > 0,
    );
    TestValidator.predicate(
      "priority has code string",
      typeof priority.code === "string" && priority.code.length > 0,
    );
    TestValidator.predicate(
      "priority has name string",
      typeof priority.name === "string" && priority.name.length > 0,
    );
    TestValidator.predicate(
      "priority has valid weight",
      typeof priority.weight === "number" &&
        priority.weight >= 1 &&
        priority.weight <= 100,
    );
    TestValidator.predicate(
      "priority has ISO date string",
      typeof priority.created_at === "string" &&
        priority.created_at.includes("T"),
    );

    if (priority.description !== undefined) {
      TestValidator.predicate(
        "optional description is string",
        typeof priority.description === "string",
      );
    }

    if (priority.is_active !== undefined) {
      TestValidator.predicate(
        "optional is_active is boolean",
        typeof priority.is_active === "boolean",
      );
    }
  }
}
