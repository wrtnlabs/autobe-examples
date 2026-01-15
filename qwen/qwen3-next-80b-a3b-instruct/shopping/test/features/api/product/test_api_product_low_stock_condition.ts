import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantInventory";
export async function test_api_product_low_stock_condition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate randomized product variant inventory data
  // Create inventory with quantity equal to low_stock_threshold to trigger 'yellow' status
  const inventoryData = {
    quantity: 5,
    low_stock_threshold: 5,
    backorder_allowed: true,
    min_order_quantity: 1,
    max_order_quantity: 100,
    availability_status: "yellow",
  } satisfies IShoppingMallProductVariantInventory;
  // Step 2: Create random product and availability IDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const availabilityId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Execute the PATCH request to update availability with the test data
  const result =
    await api.functional.shoppingMall.products.availabilities.patchByProductidAndAvailabilityid(
      connection,
      {
        productId: productId,
        availabilityId: availabilityId,
        ...inventoryData, // Flatten inventoryData properties into the request object
      },
    );
  // Step 4: Validate response type and content
  typia.assert(result);
  // Step 5: Confirm that availability_status is 'yellow' when quantity equals low_stock_threshold
  TestValidator.equals(
    "availability status should be yellow for low stock",
    result.availability_status,
    "yellow",
  );
  // Step 6: Confirm inventory quantity matches expected value
  TestValidator.equals(
    "inventory quantity should match set value",
    result.quantity,
    5,
  );
  // Step 7: Confirm low_stock_threshold matches expected value
  TestValidator.equals(
    "low stock threshold should match set value",
    result.low_stock_threshold,
    5,
  );
  // Step 8: Verify that backorder_allowed is preserved
  TestValidator.equals(
    "backorder allowed should be preserved",
    result.backorder_allowed,
    true,
  );
}