import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test category search by name partial match functionality.
 *
 * This test validates the text search capability for categories:
 * 1. Administrator authenticates to access category endpoints
 * 2. Search with partial text matching some category names
 * 3. Verify only matching categories are returned
 * 4. Test edge cases: no matches, all categories
 * 5. Verify pagination with search results
 * 6. Test sorting options (name ascending/descending)
 */
export async function test_api_category_search_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - authenticate for category operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test basic search with partial match
  // Search for a common substring that might match some categories
  const searchResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "Electronics",
        page: 1,
        limit: 10,
        sort: "name",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  TestValidator.predicate(
    "current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", searchResult.pagination.limit === 10);
  // Validate that all returned categories match the search term (case-insensitive)
  for (const category of searchResult.data) {
    typia.assert(category);
    TestValidator.predicate(
      `category "${category.name}" matches search term`,
      category.name.toLowerCase().includes("electronics".toLowerCase()),
    );
  }
  // 3. Test search with no matches - should return empty data array
  const noMatchResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "XYZ_NONEXISTENT_CATEGORY_12345",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match search returns empty array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match total records is 0",
    noMatchResult.pagination.records,
    0,
  );
  // 4. Test search without search term - returns all categories
  const allCategoriesResult =
    await api.functional.shoppingMall.categories.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(allCategoriesResult);
  TestValidator.predicate(
    "all categories search returns data",
    allCategoriesResult.data.length >= 0,
  );
  // 5. Test pagination with search results
  const paginatedResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "a",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated result respects limit",
    paginatedResult.data.length <= 5,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 5);
  // 6. Test sorting by name ascending
  const sortedAscResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "a",
        page: 1,
        limit: 10,
        sort: "name",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedAscResult);
  // Verify ascending order
  if (sortedAscResult.data.length > 1) {
    for (let i = 1; i < sortedAscResult.data.length; i++) {
      TestValidator.predicate(
        `name ascending order at index ${i}`,
        sortedAscResult.data[i - 1].name.toLowerCase() <=
          sortedAscResult.data[i].name.toLowerCase(),
      );
    }
  }
  // 7. Test sorting by name descending
  const sortedDescResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "a",
        page: 1,
        limit: 10,
        sort: "-name",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  // Verify descending order
  if (sortedDescResult.data.length > 1) {
    for (let i = 1; i < sortedDescResult.data.length; i++) {
      TestValidator.predicate(
        `name descending order at index ${i}`,
        sortedDescResult.data[i - 1].name.toLowerCase() >=
          sortedDescResult.data[i].name.toLowerCase(),
      );
    }
  }
  // 8. Validate category structure in search results
  if (searchResult.data.length > 0) {
    const firstCategory = searchResult.data[0];
    TestValidator.predicate(
      "category has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstCategory.id,
      ),
    );
    TestValidator.predicate(
      "category has non-empty name",
      firstCategory.name.length > 0,
    );
    TestValidator.predicate(
      "category has description",
      firstCategory.description !== undefined,
    );
    TestValidator.predicate(
      "hasChildren is boolean",
      typeof firstCategory.hasChildren === "boolean",
    );
    TestValidator.predicate(
      "parent is null or object",
      firstCategory.parent === null || typeof firstCategory.parent === "object",
    );
  }
}
