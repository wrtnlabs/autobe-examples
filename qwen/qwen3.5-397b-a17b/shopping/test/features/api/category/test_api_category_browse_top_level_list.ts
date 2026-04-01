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

export async function test_api_category_browse_top_level_list(
  connection: api.IConnection,
): Promise<void> {
  // Call the category list endpoint with parent_id null to get top-level categories
  const response: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        parent_id: null,
        page: 1,
        limit: 10,
        sort: "+created_at",
      } satisfies IShoppingMallCategory.IRequest,
    });
  // Validate complete response structure and types
  typia.assert(response);
  // Validate each category has parent === null (top-level business logic)
  for (const category of response.data) {
    TestValidator.equals("parent is null for top-level", category.parent, null);
  }
  // Validate pagination consistency
  TestValidator.predicate(
    "pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Validate data count is within limit
  TestValidator.predicate(
    "data length within limit",
    response.data.length <= response.pagination.limit,
  );
}
