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

export async function test_api_category_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test category search functionality with case-insensitive partial matching
  // and pagination controls
  // 1. Get all categories to have baseline data
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // 2. Test name filtering with case-insensitive partial match
  if (allCategories.data.length > 0) {
    const category = allCategories.data[0];
    const partialName = category.name.substring(
      0,
      Math.min(3, category.name.length),
    );
    // Search with partial name (case-insensitive)
    const searchResult = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          name: partialName,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(searchResult);
    // Verify all results contain the partial name (case-insensitive)
    TestValidator.predicate(
      "all results contain partial name (case-insensitive)",
      searchResult.data.every((cat) =>
        cat.name.toLowerCase().includes(partialName.toLowerCase()),
      ),
    );
    // Test case-insensitivity with uppercase
    const upperSearch = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          name: partialName.toUpperCase(),
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(upperSearch);
    TestValidator.equals(
      "case-insensitive search returns same count",
      searchResult.pagination.records,
      upperSearch.pagination.records,
    );
  }
  // 3. Test pagination with custom page and limit values
  if (allCategories.data.length >= 3) {
    const page1 = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(page1);
    TestValidator.equals("page 1 current", page1.pagination.current, 1);
    TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
    TestValidator.predicate(
      "page 1 has at most 2 items",
      page1.data.length <= 2,
    );
    const page2 = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
    // Verify different pages return different results (if enough data)
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.notEquals(
        "different pages have different data",
        page1.data[0].id,
        page2.data[0].id,
      );
    }
  }
  // 4. Test sorting options
  if (allCategories.data.length >= 2) {
    // Sort by name ascending
    const nameAsc = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          sort: "name",
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(nameAsc);
    // Sort by name descending
    const nameDesc = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          sort: "-name",
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(nameDesc);
    // Verify ascending order
    for (let i = 1; i < nameAsc.data.length; i++) {
      TestValidator.predicate(
        "name ascending order",
        nameAsc.data[i - 1].name.localeCompare(nameAsc.data[i].name) <= 0,
      );
    }
    // Verify descending order
    for (let i = 1; i < nameDesc.data.length; i++) {
      TestValidator.predicate(
        "name descending order",
        nameDesc.data[i - 1].name.localeCompare(nameDesc.data[i].name) >= 0,
      );
    }
    // Sort by createdAt ascending
    const createdAsc = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          sort: "createdAt",
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(createdAsc);
    // Sort by createdAt descending
    const createdDesc = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          sort: "-createdAt",
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(createdDesc);
    // Verify createdAt ascending order
    for (let i = 1; i < createdAsc.data.length; i++) {
      TestValidator.predicate(
        "createdAt ascending order",
        new Date(createdAsc.data[i - 1].created_at) <=
          new Date(createdAsc.data[i].created_at),
      );
    }
    // Verify createdAt descending order
    for (let i = 1; i < createdDesc.data.length; i++) {
      TestValidator.predicate(
        "createdAt descending order",
        new Date(createdDesc.data[i - 1].created_at) >=
          new Date(createdDesc.data[i].created_at),
      );
    }
  }
  // 5. Test combined filters (name + parentId) - AND logic
  // Find a category with parent (subcategory)
  const subcategory = allCategories.data.find((cat) => cat.parent !== null);
  if (subcategory) {
    const partialName = subcategory.name.substring(
      0,
      Math.min(2, subcategory.name.length),
    );
    const combinedFilter = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          name: partialName,
          parentId: subcategory.parent!.id,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(combinedFilter);
    // Verify all results match both conditions
    TestValidator.predicate(
      "combined filter matches both conditions",
      combinedFilter.data.every(
        (cat) =>
          cat.name.toLowerCase().includes(partialName.toLowerCase()) &&
          cat.parent !== null &&
          cat.parent.id === subcategory.parent!.id,
      ),
    );
  }
  // 6. Test topLevelOnly takes precedence over parentId
  const topLevelResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        topLevelOnly: true,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelResult);
  // Verify all results are top-level (no parent)
  TestValidator.predicate(
    "topLevelOnly returns only categories without parent",
    topLevelResult.data.every((cat) => cat.parent === null),
  );
  // Test that topLevelOnly takes precedence over parentId
  const precedenceTest = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        topLevelOnly: true,
        parentId: typia.random<string & typia.tags.Format<"uuid">>(),
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(precedenceTest);
  // Should still return only top-level categories (topLevelOnly takes precedence)
  TestValidator.predicate(
    "topLevelOnly takes precedence over parentId",
    precedenceTest.data.every((cat) => cat.parent === null),
  );
  // 7. Test empty result set returns proper pagination
  const emptySearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        name: "NONEXISTENT_CATEGORY_NAME_12345_XYZ",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty result has 0 records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty result has empty data",
    emptySearch.data.length === 0,
  );
  // 8. Test maximum limit (100)
  const maxLimit = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit accepted", maxLimit.pagination.limit, 100);
  TestValidator.predicate(
    "results at or below limit",
    maxLimit.data.length <= 100,
  );
}
