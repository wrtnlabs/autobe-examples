import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination (no parameters)
  const defaultResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {} satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    typeof defaultResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    defaultResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is valid",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid",
    defaultResponse.pagination.pages >= 0,
  );
  // Validate pagination calculation
  const expectedPages = Math.ceil(
    defaultResponse.pagination.records / defaultResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    defaultResponse.pagination.pages,
    expectedPages,
  );
  // Test 2: Explicit pagination parameters
  const page = 1;
  const limit = 10;
  const explicitResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        page: page,
        limit: limit,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(explicitResponse);
  // Validate explicit pagination parameters
  TestValidator.equals(
    "current page matches request",
    explicitResponse.pagination.current,
    page,
  );
  TestValidator.equals(
    "limit matches request",
    explicitResponse.pagination.limit,
    limit,
  );
  // Test 3: Different page and limit combinations
  const combinations = [
    { page: 2, limit: 5 },
    { page: 1, limit: 20 },
    { page: 3, limit: 15 },
  ];
  for (const combo of combinations) {
    const comboResponse = await api.functional.multiUserTodo.guests.index(
      connection,
      {
        body: {
          page: combo.page,
          limit: combo.limit,
        } satisfies IMultiUserTodoGuest.IRequest,
      },
    );
    typia.assert(comboResponse);
    TestValidator.equals(
      `page ${combo.page} current page`,
      comboResponse.pagination.current,
      combo.page,
    );
    TestValidator.equals(
      `page ${combo.page} limit`,
      comboResponse.pagination.limit,
      combo.limit,
    );
    // Validate data array size doesn't exceed limit
    TestValidator.predicate(
      `page ${combo.page} data size <= limit`,
      comboResponse.data.length <= combo.limit,
    );
  }
}
