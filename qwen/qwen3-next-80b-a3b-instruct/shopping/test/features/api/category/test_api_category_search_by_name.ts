import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the test - no authentication required for this public endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate search criteria with 'Electronics' in name using static value that matches specification
  const searchCriteria = {
    name: "Electronics",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  // Execute the search request to find categories containing 'Electronics'
  const result: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(guestConnection, {
      body: searchCriteria,
    });
  // Validate the response structure with typia.assert
  typia.assert(result);
  // Validate pagination metadata structure and values
  TestValidator.equals("pagination structure correct", result.pagination, {
    current: result.pagination.current,
    limit: result.pagination.limit,
    records: result.pagination.records,
    pages: result.pagination.pages,
  });
  // Validate that at least one result contains 'Electronics' in name
  TestValidator.predicate(
    "at least one result contains Electronics",
    result.data.some((category) => category.name.includes("Electronics")),
  );
  // Validate that not all results contain 'Electronics' (ensuring filtering isn't too aggressive)
  TestValidator.predicate(
    "not all results contain Electronics",
    result.data.some((category) => !category.name.includes("Electronics")),
  );
}
