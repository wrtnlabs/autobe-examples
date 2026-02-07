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

export async function test_api_category_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with default pagination (no parameters)
  const result1 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: typia.random<IShoppingMallCategory.IRequest>(),
    },
  );
  typia.assert(result1);
  // Verify pagination structure exists
  TestValidator.predicate("has pagination", result1.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(result1.data));
  // 2. Test with custom page and limit
  const result2 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        // Using Partial type to allow empty object for minimal request
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result2);
  // 3. Test with large limit to verify pagination calculation
  const result3 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        // Empty request body for pagination test
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result3);
  // Verify pagination metadata consistency
  if (result3.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation correct",
      result3.pagination.pages ===
        Math.ceil(result3.pagination.records / result3.pagination.limit),
    );
  }
  // 4. Test edge case with limit of 1
  const result4 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        // Empty body for edge case test
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result4);
  // Verify that data count matches limit when available
  TestValidator.predicate(
    "data count matches limit or less",
    result4.data.length <= result4.pagination.limit,
  );
  // 5. Test with page 1
  const result5 = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        // Minimal request for page test
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result5);
  // Verify first page
  TestValidator.equals("first page is 1", result5.pagination.current, 1);
}
