import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMvShoppingMallDailySale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMvShoppingMallDailySale";
import type { IShoppingMallMvShoppingMallDailySale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallDailySale";

export async function test_api_shopping_mall_daily_sales_public_retrieval(
  connection: api.IConnection,
) {
  // Prepare request body with valid pagination and date range filters
  const now = new Date();
  // Define sales_date_from as 7 days ago
  const fromDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Define sales_date_to as current time
  const toDate = now.toISOString();

  const requestBody = {
    sales_date_from: fromDate,
    sales_date_to: toDate,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallMvShoppingMallDailySale.IRequest;

  // Call API function
  const output: IPageIShoppingMallMvShoppingMallDailySale.ISummary =
    await api.functional.shoppingMall.mvShoppingMallDailySales.index(
      connection,
      {
        body: requestBody,
      },
    );

  // Assert output type correctness
  typia.assert(output);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page is positive integer",
    output.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination limit is positive integer",
    output.pagination.limit >= 1 && output.pagination.limit <= 1000,
  );

  TestValidator.predicate(
    "pagination total pages equal to ceiling of total records divided by limit",
    output.pagination.pages >= 0 &&
      output.pagination.pages ===
        Math.ceil(output.pagination.records / output.pagination.limit),
  );

  // Validate that data is an array
  TestValidator.predicate("data is an array", Array.isArray(output.data));

  // If data array is not empty, validate each summary item
  if (output.data.length > 0) {
    for (const summary of output.data) {
      // Assert each summary item matches the ISummary type
      typia.assert(summary);

      // Validate id is a UUID string
      TestValidator.predicate(
        "summary id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          summary.id,
        ),
      );

      // Validate sales_date is within requested range
      const salesDate = new Date(summary.sales_date);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      TestValidator.predicate(
        "summary sales_date within request range",
        salesDate >= from && salesDate <= to,
      );

      // Validate total_orders is positive integer (>=0)
      TestValidator.predicate(
        "summary total_orders non-negative integer",
        Number.isInteger(summary.total_orders) && summary.total_orders >= 0,
      );

      // Validate total_sales_amount is number and >= 0
      TestValidator.predicate(
        "summary total_sales_amount non-negative number",
        typeof summary.total_sales_amount === "number" &&
          summary.total_sales_amount >= 0,
      );

      // Validate total_items_sold is positive integer (>= 0)
      TestValidator.predicate(
        "summary total_items_sold non-negative integer",
        Number.isInteger(summary.total_items_sold) &&
          summary.total_items_sold >= 0,
      );
    }
  }
}
