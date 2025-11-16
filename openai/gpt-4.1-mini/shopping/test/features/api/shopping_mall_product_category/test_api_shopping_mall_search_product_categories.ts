import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_shopping_mall_search_product_categories(
  connection: api.IConnection,
) {
  // Test search with a random search string for category name/code
  const searchQuery = RandomGenerator.paragraph({ sentences: 1 }).trim();
  const response1 =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: searchQuery,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "searchQuery filtering",
    response1.data.every(
      (item) =>
        item.name.includes(searchQuery) || item.code.includes(searchQuery),
    ),
  );

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page",
    response1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    response1.pagination.limit === 10,
  );
  TestValidator.predicate("pagination pages", response1.pagination.pages >= 1);
  TestValidator.predicate(
    "pagination records",
    response1.pagination.records >= response1.data.length,
  );

  // Test filtering by parentCategoryCode or null
  let parentCategoryCode: string | null = null;
  if (response1.data.length > 0) {
    parentCategoryCode = response1.data[0].parent_category_id ?? null;
  }
  const response2 =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          parentCategoryCode: parentCategoryCode,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(response2);
  if (parentCategoryCode !== null) {
    TestValidator.predicate(
      "parentCategoryCode filter",
      response2.data.every(
        (item) => item.parent_category_id === parentCategoryCode,
      ),
    );
  }

  // Test filtering by created date range
  const dateFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const dateTo = new Date().toISOString();
  const response3 =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          createdFrom: dateFrom,
          createdTo: dateTo,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(response3);

  TestValidator.predicate(
    "pagination records within date range",
    response3.pagination.records >= response3.data.length,
  );

  // Test pagination page 2 if exists
  if (response3.pagination.pages > 1) {
    const responsePage2 =
      await api.functional.shoppingMall.shoppingMallProductCategories.index(
        connection,
        {
          body: {
            page: 2,
            limit: 15,
            sortBy: "name",
            sortOrder: "asc",
          } satisfies IShoppingMallProductCategory.IRequest,
        },
      );
    typia.assert(responsePage2);
    TestValidator.predicate(
      "pagination second page",
      responsePage2.pagination.current === 2,
    );
  }

  // Test sorting by name ascending
  const responseSortAsc =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(responseSortAsc);
  for (let i = 1; i < responseSortAsc.data.length; i++) {
    TestValidator.predicate(
      `name sorting asc at index ${i}`,
      responseSortAsc.data[i - 1].name <= responseSortAsc.data[i].name,
    );
  }

  // Test sorting by name descending
  const responseSortDesc =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "name",
          sortOrder: "desc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(responseSortDesc);
  for (let i = 1; i < responseSortDesc.data.length; i++) {
    TestValidator.predicate(
      `name sorting desc at index ${i}`,
      responseSortDesc.data[i - 1].name >= responseSortDesc.data[i].name,
    );
  }

  // Test sorting by created_at ascending
  const responseSortCreatedAtAsc =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(responseSortCreatedAtAsc);

  // Test sorting by created_at descending
  const responseSortCreatedAtDesc =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(responseSortCreatedAtDesc);

  // Cannot strictly validate created_at sorting due to missing created_at in summary.

  // Test combined filters
  const combinedResponse =
    await api.functional.shoppingMall.shoppingMallProductCategories.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: searchQuery,
          parentCategoryCode: parentCategoryCode,
          createdFrom: dateFrom,
          createdTo: dateTo,
          sortBy: "name",
          sortOrder: "asc",
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filters pagination",
    combinedResponse.pagination.records >= combinedResponse.data.length,
  );
  TestValidator.predicate(
    "combined filters search",
    combinedResponse.data.every(
      (item) =>
        item.name.includes(searchQuery) || item.code.includes(searchQuery),
    ),
  );
  if (parentCategoryCode !== null) {
    TestValidator.predicate(
      "combined filters parentCategoryCode",
      combinedResponse.data.every(
        (item) => item.parent_category_id === parentCategoryCode,
      ),
    );
  }
}
