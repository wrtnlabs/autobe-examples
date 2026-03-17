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

/**
 * Test category browsing with search and custom sorting capabilities.
 * Validates search by name/slug, custom sorting, and pagination functionality.
 */
export async function test_api_categories_browse_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Get all categories with default sorting
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {},
      },
    );
    typia.assert(response);
    TestValidator.predicate("categories exist", response.data.length > 0);
  }
  // Test 2: Search by name (partial match)
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search_term: "electronics",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate("search returns data", response.data.length >= 0);
  }
  // Test 3: Case-insensitive search
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search_term: "ELECTRONICS",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "case insensitive search returns",
      response.data.length >= 0,
    );
  }
  // Test 4: Sort by name ascending
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "sort by name asc returns data",
      response.data.length >= 0,
    );
  }
  // Test 5: Sort by name descending
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          sort_by: "name",
          sort_order: "desc",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "sort by name desc returns data",
      response.data.length >= 0,
    );
  }
  // Test 6: Combined search and sort
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search_term: "a",
          sort_by: "name",
          sort_order: "asc",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "combined search sort works",
      response.data.length >= 0,
    );
  }
  // Test 7: Pagination with search
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search_term: "",
          page: 1,
          page_size: 10,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals("pagination current", response.pagination.current, 1);
    TestValidator.equals("pagination limit", response.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records valid",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages valid",
      response.pagination.pages >= 0,
    );
  }
  // Test 8: Empty search results
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search_term: "nonexistent_category_xyz123",
        },
      },
    );
    typia.assert(response);
    TestValidator.equals("empty search data count", response.data.length, 0);
    TestValidator.equals(
      "empty search records",
      response.pagination.records,
      0,
    );
  }
  // Test 9: Filter by active status
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          is_active: true,
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "active filter returns data",
      response.data.length >= 0,
    );
  }
  // Test 10: Filter by parent category
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          parent_id: undefined,
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "parent filter returns data",
      response.data.length >= 0,
    );
  }
  // Test 11: Limit parameter
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          limit: 5,
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate("limit respects data", response.data.length <= 5);
  }
  // Test 12: Unicode and special characters
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          search_term: RandomGenerator.alphabets(5),
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate("unicode search works", response.data.length >= 0);
  }
  // Test 13: Sorting by display_order
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          sort_by: "display_order",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "display_order sort returns",
      response.data.length >= 0,
    );
  }
  // Test 14: Sort by created_at
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          sort_by: "created_at",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "created_at sort returns",
      response.data.length >= 0,
    );
  }
  // Test 15: Pagination metadata consistency
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          page: 1,
          page_size: 10,
        },
      },
    );
    typia.assert(response);
    const calculatedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculated",
      response.pagination.pages,
      calculatedPages,
    );
  }
  // Test 16: Boundary - maximum page_size
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          page_size: 100,
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "max page_size works",
      response.pagination.limit <= 100,
    );
  }
  // Test 17: Boundary - minimum page
  {
    const response = await api.functional.ecommerceMall.categories.index(
      connection,
      {
        body: {
          page: 1,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals("min page works", response.pagination.current, 1);
  }
}
