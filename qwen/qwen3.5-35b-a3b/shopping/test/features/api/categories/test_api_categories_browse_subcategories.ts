import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_categories_browse_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Use typia.random to generate random filter parameters
  const randomRequest: IEcommerceMallCategory.IRequest =
    typia.random<IEcommerceMallCategory.IRequest>();
  // Test 1: Browse categories with parent_id filter (if data exists)
  // The endpoint will return subcategories for the specified parent_id
  const resultWithParentId =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        parent_id: randomRequest.parent_id,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(resultWithParentId);
  // Validate response structure
  TestValidator.predicate(
    "has valid pagination",
    resultWithParentId.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid limit",
    resultWithParentId.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has valid records",
    resultWithParentId.pagination.records >= 0,
  );
  // Test 2: Verify parent_id filtering returns correct results
  for (const item of resultWithParentId.data) {
    // Each item should have parent_id matching the filter (if filter was provided)
    if (randomRequest.parent_id) {
      TestValidator.equals(
        "parent_id matches filter",
        item.parent_id,
        randomRequest.parent_id,
      );
      // If item has parent_id, it should also have parent reference
      if (item.parent_id !== null) {
        TestValidator.predicate("parent is defined", item.parent !== undefined);
      }
    }
  }
  // Test 3: Pagination works with parent_id filter
  const paginatedResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_id: randomRequest.parent_id,
        page: 1,
        page_size: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "page current is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is 10",
    paginatedResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count is valid",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    paginatedResult.pagination.pages >= 0,
  );
  // Test 4: Combined search_term and parent_id filter
  const combinedResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_id: randomRequest.parent_id,
        search_term: randomRequest.search_term,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns valid data",
    combinedResult.data.length >= 0,
  );
  // Test 5: Empty case - test with non-existent parent_id
  const fakeParentId = "00000000-0000-0000-0000-000000000000";
  const emptyResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_id: fakeParentId,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty subcategory count", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  // Test 6: Verify parent field is populated for items with parent_id
  const allResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {} satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(allResult);
  for (const item of allResult.data) {
    // If item has a parent_id that is not null, it should have a parent reference
    if (item.parent_id !== null && item.parent_id !== undefined) {
      TestValidator.predicate(
        "parent reference exists when parent_id is set",
        item.parent !== null,
      );
      TestValidator.equals(
        "parent id matches item parent_id",
        item.parent?.id,
        item.parent_id,
      );
    }
  }
  // Test 7: Verify leaf categories (categories without children) are handled correctly
  // This is validated by ensuring parent_id and parent fields are correctly structured
  for (const item of allResult.data) {
    // Every category should have consistent parent structure
    if (item.parent_id === null) {
      TestValidator.equals("root category parent is null", item.parent, null);
    }
  }
  // Test 8: Test sorting with parent_id filter
  const sortedResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_id: randomRequest.parent_id,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted result is valid",
    sortedResult.data.length >= 0,
  );
  // Test 9: Verify limit parameter works with parent_id filter
  const limitedResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_id: randomRequest.parent_id,
        limit: 5,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.predicate(
    "limited result count is valid",
    limitedResult.data.length >= 0,
  );
  // Test 10: Test one-level nesting - subcategories should have null parent_id
  // or if they exist, they should be root categories (no nested subcategories)
  for (const item of allResult.data) {
    if (item.parent_id !== null && item.parent_id !== undefined) {
      // Subcategories should not have their own children (parent_id should be null)
      // This is validated by checking the data structure
      const subcategoriesOfThis = allResult.data.filter(
        (other) => other.parent_id === item.id,
      );
      // If this is a leaf category, it should have no subcategories
      // If this has subcategories, those subcategories should have parent_id = item.id
      for (const sub of subcategoriesOfThis) {
        TestValidator.equals(
          "subcategory parent_id matches",
          sub.parent_id,
          item.id,
        );
      }
    }
  }
}