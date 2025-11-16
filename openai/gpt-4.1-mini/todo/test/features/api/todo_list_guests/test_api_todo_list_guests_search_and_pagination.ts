import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListGuest";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";

// We will generate several requests with:
// 1. All filters empty (empty search string, undefined completed and priority)
// 2. Completed true filter
// 3. Completed false filter
// 4. Priority levels 1-5 tested
// 5. Search text substring matching
// For each, we will verify response type and pagination parameters.

export async function test_api_todo_list_guests_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Test no filters, default page=1, limit=10
  const baseRequest1 = {
    page: 1,
    limit: 10,
  } satisfies ITodoListTodoListGuest.IRequest;

  // 2. Test completed true
  const requestCompletedTrue = {
    ...baseRequest1,
    completed: true,
  } satisfies ITodoListTodoListGuest.IRequest;

  // 3. Test completed false
  const requestCompletedFalse = {
    ...baseRequest1,
    completed: false,
  } satisfies ITodoListTodoListGuest.IRequest;

  // 4. Test priority levels 1 to 5
  const priorityLevels = [1, 2, 3, 4, 5] as const;

  // 5. Test search with a random substring
  const searchContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 10,
  });
  const searchSubstr = RandomGenerator.substring(searchContent);

  // Control function to call index with given request
  async function callIndex(request: ITodoListTodoListGuest.IRequest) {
    const output = await api.functional.todoList.todoListGuests.index(
      connection,
      {
        body: request,
      },
    );
    typia.assert(output);
    TestValidator.predicate(
      `pagination current page is ${request.page}`,
      output.pagination.current === request.page,
    );
    TestValidator.predicate(
      `pagination limit is ${request.limit}`,
      output.pagination.limit === request.limit,
    );
    TestValidator.predicate(
      `pagination pages is non-negative integer`,
      Number.isInteger(output.pagination.pages) && output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `pagination records is non-negative integer`,
      Number.isInteger(output.pagination.records) &&
        output.pagination.records >= 0,
    );
    TestValidator.predicate(`all data is array`, Array.isArray(output.data));
    // Validate each data item
    for (const item of output.data) {
      typia.assert(item);
      TestValidator.predicate(
        `item id is uuid`,
        /^[0-9a-fA-F-]{36}$/.test(item.id),
      );
      TestValidator.predicate(
        "item priority in range",
        1 <= item.priority && item.priority <= 5,
      );
      TestValidator.predicate(
        "item is_completed is boolean",
        typeof item.is_completed === "boolean",
      );
      TestValidator.predicate(
        "item content is string",
        typeof item.content === "string",
      );
      TestValidator.predicate(
        "item created_at is ISO datetime",
        typeof item.created_at === "string" &&
          !Number.isNaN(Date.parse(item.created_at)),
      );
    }
    return output;
  }

  await callIndex(baseRequest1);
  await callIndex(requestCompletedTrue);
  await callIndex(requestCompletedFalse);

  // Test priority levels
  for (const level of priorityLevels) {
    await callIndex({
      ...baseRequest1,
      priority: level,
    });
  }

  // Test search with substring
  await callIndex({
    ...baseRequest1,
    search: searchSubstr,
  });
}
