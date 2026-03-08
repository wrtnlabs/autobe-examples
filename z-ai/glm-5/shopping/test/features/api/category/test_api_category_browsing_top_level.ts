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

export async function test_api_category_browsing_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get top-level categories with topLevelOnly flag
  const topLevelCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        topLevelOnly: true,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelCategories);
  // 2. Verify pagination metadata defaults
  TestValidator.equals(
    "default page is 1",
    topLevelCategories.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    topLevelCategories.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records is non-negative",
    topLevelCategories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    topLevelCategories.pagination.pages >= 0,
  );
  // 3. Validate each top-level category has parent as null
  for (const category of topLevelCategories.data) {
    TestValidator.equals(
      "top-level category has null parent",
      category.parent,
      null,
    );
    TestValidator.predicate("category has name", category.name.length > 0);
  }
  // 4. Test sorting by name ascending
  const sortedCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        topLevelOnly: true,
        sort: "name",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedCategories);
  // 5. Verify alphabetical ordering
  const names = sortedCategories.data.map((c) => c.name);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "categories sorted by name ascending",
    names,
    sortedNames,
  );
  // 6. Test with explicit pagination parameters
  const paginatedCategories =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        topLevelOnly: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(paginatedCategories);
  TestValidator.equals(
    "explicit page is 1",
    paginatedCategories.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit is 10",
    paginatedCategories.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedCategories.data.length <= 10,
  );
}
