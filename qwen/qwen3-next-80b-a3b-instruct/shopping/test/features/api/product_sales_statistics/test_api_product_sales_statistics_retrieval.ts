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
export async function test_api_product_sales_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Call the API to retrieve product sales statistics with default pagination
  const response: IPageIShoppingMallProductSalesStat =
    await api.functional.shoppingMall.reports.products.sales.index(connection);
  // Perform complete type validation using typia.assert
  typia.assert(response);
  // Validate that pagination object exists and has correct structure
  TestValidator.equals(
    "pagination object exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current property",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit property",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records property",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages property",
    typeof response.pagination.pages,
    "number",
  );
  // Validate that data array exists and is an array
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // Validate the data array contains at least the number of items expected
  TestValidator.predicate(
    "data array not empty if records > 0",
    response.pagination.records === 0 || response.data.length > 0,
  );
  // Validate each item in data array is a numeric type as defined by IShoppingMallProductSalesStat
  for (const item of response.data) {
    TestValidator.equals("each data item is a number", typeof item, "number");
  }
  // Validate pagination properties have non-negative values as per type constraints
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pagination consistency: pages should be ceil(records / limit) when records > 0
  TestValidator.predicate(
    "pagination consistency when records > 0",
    response.pagination.records === 0 ||
      Math.ceil(response.pagination.records / response.pagination.limit) ===
        response.pagination.pages,
  );
  // Validate pagination consistency: pages should be 0 when records === 0
  TestValidator.predicate(
    "pages is 0 when records is 0",
    response.pagination.records === 0 ? response.pagination.pages === 0 : true,
  );
}
