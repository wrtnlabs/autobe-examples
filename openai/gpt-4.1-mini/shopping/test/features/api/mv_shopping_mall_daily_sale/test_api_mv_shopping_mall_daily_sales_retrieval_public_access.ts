import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallMvShoppingMallDailySale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallDailySale";

/**
 * Test that the daily sales summary record can be retrieved publicly by unique
 * identifier. Validate that the response contains all expected fields such as
 * total orders, total sales amount, and total items sold with correct data
 * formats and values consistent with the business rules. Ensure the endpoint
 * properly handles valid and invalid UUIDs and returns appropriate status
 * codes.
 */
export async function test_api_mv_shopping_mall_daily_sales_retrieval_public_access(
  connection: api.IConnection,
) {
  // Generate a valid UUID for a daily sales summary record to retrieve
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 1. Successful retrieval of a valid daily sales summary record
  const dailySale: IShoppingMallMvShoppingMallDailySale =
    await api.functional.shoppingMall.mvShoppingMallDailySales.at(connection, {
      id: validId,
    });
  typia.assert(dailySale);

  // Assertions to validate all required fields and their types/formats
  TestValidator.predicate(
    "valid daily sale id is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      dailySale.id,
    ),
  );
  TestValidator.equals("returned id matches request id", dailySale.id, validId);
  TestValidator.predicate(
    "sales_date is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      dailySale.sales_date,
    ),
  );
  TestValidator.predicate(
    "total_orders is integer and non-negative",
    Number.isInteger(dailySale.total_orders) && dailySale.total_orders >= 0,
  );
  TestValidator.predicate(
    "total_sales_amount is number and non-negative",
    typeof dailySale.total_sales_amount === "number" &&
      dailySale.total_sales_amount >= 0,
  );
  TestValidator.predicate(
    "total_items_sold is integer and non-negative",
    Number.isInteger(dailySale.total_items_sold) &&
      dailySale.total_items_sold >= 0,
  );

  // 2. Retrieval with invalid UUID should throw error
  await TestValidator.error(
    "should fail retrieving with invalid UUID",
    async () => {
      await api.functional.shoppingMall.mvShoppingMallDailySales.at(
        connection,
        {
          id: "invalid-uuid-format-string",
        },
      );
    },
  );
}
