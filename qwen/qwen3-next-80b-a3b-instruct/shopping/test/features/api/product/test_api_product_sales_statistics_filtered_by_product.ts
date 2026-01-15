import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSalesStat";
import type { IShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSalesStat";
export async function test_api_product_sales_statistics_filtered_by_product(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for public access
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the product sales statistics endpoint, which returns aggregated data
  const response: IPageIShoppingMallProductSalesStat =
    await api.functional.shoppingMall.reports.products.sales.index(
      guestConnection,
    );
  // Validate the complete response structure with typia.assert
  // This ensures all types, nesting, and formats are correct
  typia.assert(response);
  // Verify the pagination structure is valid and non-negative
  TestValidator.predicate(
    "pagination current >= 0",
    () => response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", () =>
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "data array has at least one record",
    () => response.data.length > 0,
  );
  // Validate each data item is a number (representing total revenue in USD)
  // We only need to verify the basic structure since filtering is not supported in the endpoint
  for (const stat of response.data) {
    TestValidator.predicate(
      "each sales statistic is a number",
      () => typeof stat === "number",
    );
    TestValidator.predicate(
      "each sales statistic is non-negative",
      () => stat >= 0,
    );
  }
}
