import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantInventory";
export async function test_api_product_backorder_availability(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection as per connection isolation pattern
  const testConnection: api.IConnection = { host: connection.host };
  // Generate random UUIDs for productId and availabilityId
  const productId = typia.random<string & tags.Format<"uuid">>();
  const availabilityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the product variant inventory using the patch endpoint (read-only)
  const updatedInventory =
    await api.functional.shoppingMall.products.availabilities.patchByProductidAndAvailabilityid(
      testConnection,
      {
        productId,
        availabilityId,
      },
    );
  // Validate the response structure meets the IShoppingMallProductVariantInventory schema
  typia.assert(updatedInventory);
  // Validate that all properties conform to their schema constraints (business logic)
  TestValidator.predicate(
    "quantity is non-negative",
    updatedInventory.quantity >= 0,
  );
  TestValidator.predicate(
    "low_stock_threshold is non-negative",
    updatedInventory.low_stock_threshold >= 0,
  );
  TestValidator.predicate(
    "backorder_allowed is a boolean",
    typeof updatedInventory.backorder_allowed === "boolean",
  );
  TestValidator.predicate(
    "availability_status is valid",
    ["green", "yellow", "red", "gray"].includes(
      updatedInventory.availability_status,
    ),
  );
  TestValidator.predicate(
    "min_order_quantity is at least 1",
    updatedInventory.min_order_quantity >= 1,
  );
  TestValidator.predicate(
    "max_order_quantity is 0 or at least 1",
    updatedInventory.max_order_quantity === 0 ||
      updatedInventory.max_order_quantity >= 1,
  );
}
