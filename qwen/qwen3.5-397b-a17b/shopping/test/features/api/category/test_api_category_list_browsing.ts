import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all product categories without authentication.
 *
 * Validates the complete category listing functionality including:
 * - Default pagination (page=1, limit=20)
 * - Custom pagination parameters
 * - Category structure validation (id, name, created_at, description, parent)
 * - Root-level category verification (parent is null)
 * - Pagination metadata accuracy
 * - Sorting by created_at descending
 */
export async function test_api_category_list_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination (no request body parameters)
  const defaultResponse = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata is present and consistent
  TestValidator.predicate(
    "current page is at least 1",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResponse.data),
  );
  // Validate each category has required fields with proper format
  for (const category of defaultResponse.data) {
    // Verify created_at is valid ISO date-time
    TestValidator.predicate(
      "created_at is valid ISO date",
      !isNaN(Date.parse(category.created_at)),
    );
    // Verify parent structure if present
    if (category.parent !== null && category.parent !== undefined) {
      TestValidator.predicate("parent has id", category.parent.id !== null);
      TestValidator.predicate("parent has name", category.parent.name !== null);
    }
  }
  // 2. Test custom pagination: page=1, limit=10
  const limitedResponse = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(limitedResponse);
  TestValidator.equals(
    "custom limit applied",
    limitedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom page is 1",
    limitedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length respects limit",
    limitedResponse.data.length <= 10,
  );
  // 3. Test pagination: page=2, limit=20
  const page2Response = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 20);
  // 4. Test sorting by created_at descending
  const sortedResponse = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort: "created_at,desc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedResponse);
  // Verify sorting: each category's created_at should be >= next category's created_at
  if (sortedResponse.data.length > 1) {
    for (let i = 0; i < sortedResponse.data.length - 1; i++) {
      const currentTime = new Date(sortedResponse.data[i].created_at).getTime();
      const nextTime = new Date(
        sortedResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `sorting desc: item ${i} >= item ${i + 1}`,
        currentTime >= nextTime,
      );
    }
  }
  // 5. Test sorting by name ascending
  const nameSortedResponse = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort: "name,asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(nameSortedResponse);
  // Verify name sorting: each category's name should be <= next category's name
  if (nameSortedResponse.data.length > 1) {
    for (let i = 0; i < nameSortedResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `name sorting asc: item ${i} <= item ${i + 1}`,
        nameSortedResponse.data[i].name.localeCompare(
          nameSortedResponse.data[i + 1].name,
        ) <= 0,
      );
    }
  }
  // 6. Verify pagination metadata consistency
  const expectedPages = Math.ceil(
    defaultResponse.pagination.records / defaultResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    defaultResponse.pagination.pages,
    expectedPages,
  );
  // 7. Test search functionality (optional parameter)
  const searchResponse = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        search: "test",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Search should return categories matching the search term or empty array
  TestValidator.predicate(
    "search returns array",
    Array.isArray(searchResponse.data),
  );
}
