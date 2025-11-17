import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallMvShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallInventoryStatus";

export async function test_api_shopping_mall_inventory_status_retrieval(
  connection: api.IConnection,
) {
  // Generate a realistic UUID v4 for the inventory status record ID
  const inventoryStatusId = typia.random<string & tags.Format<"uuid">>();

  // Fetch the inventory status record by ID
  const result: IShoppingMallMvShoppingMallInventoryStatus =
    await api.functional.shoppingMall.mvShoppingMallInventoryStatus.at(
      connection,
      { id: inventoryStatusId },
    );

  // Assert that the returned data matches the schema
  typia.assert(result);

  // Validate each property according to business logic and description
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.predicate(
    "category_id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.category_id,
    ),
  );

  // total_sku_count must be non-negative int32
  TestValidator.predicate(
    "total_sku_count is non-negative integer",
    Number.isInteger(result.total_sku_count) && result.total_sku_count >= 0,
  );
  // total_inventory_quantity must be non-negative int32
  TestValidator.predicate(
    "total_inventory_quantity is non-negative integer",
    Number.isInteger(result.total_inventory_quantity) &&
      result.total_inventory_quantity >= 0,
  );
  // low_stock_threshold must be non-negative int32
  TestValidator.predicate(
    "low_stock_threshold is non-negative integer",
    Number.isInteger(result.low_stock_threshold) &&
      result.low_stock_threshold >= 0,
  );
  // low_stock_sku_count must be non-negative int32
  TestValidator.predicate(
    "low_stock_sku_count is non-negative integer",
    Number.isInteger(result.low_stock_sku_count) &&
      result.low_stock_sku_count >= 0,
  );

  // last_refreshed_at must be a valid ISO date-time string (RFC 3339)
  TestValidator.predicate(
    "last_refreshed_at is valid ISO date-time",
    !isNaN(Date.parse(result.last_refreshed_at)),
  );
}
