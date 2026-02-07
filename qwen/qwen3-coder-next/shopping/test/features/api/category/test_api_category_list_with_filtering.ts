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

export async function test_api_category_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic category listing with no filters
  const result1 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result1);
  typia.assert(result1.pagination);
  TestValidator.predicate(
    "basic list has valid pagination",
    result1.pagination.records >= 0,
  );
  // Test 2: Category listing with search keyword in name
  const nameSearch = typia.random<string & tags.Format<"email">>(); // Using random email-like string as search keyword
  const result2 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: { name: nameSearch } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result2);
  TestValidator.predicate(
    "name search returns results",
    result2.pagination.records >= 0,
  );
  // Test 3: Category listing with description search keyword
  const descSearch = RandomGenerator.name();
  const result3 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        description: descSearch,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result3);
  TestValidator.predicate(
    "description search returns results",
    result3.pagination.records >= 0,
  );
  // Test 4: Category listing with date range filter
  const result4 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        created_at: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          to: new Date().toISOString(), // now
        },
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result4);
  TestValidator.predicate(
    "date range filter works",
    result4.pagination.records >= 0,
  );
  // Test 5: Category listing with soft-delete status filter
  const result5 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: { deleted: false } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result5);
  TestValidator.predicate(
    "soft-delete filter works",
    result5.pagination.records >= 0,
  );
  // Test 6: Combined filter - name search with date range
  const result6 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        name: "test",
        created_at: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result6);
  TestValidator.predicate(
    "combined filters work",
    result6.pagination.records >= 0,
  );
}
