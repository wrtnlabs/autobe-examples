import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantInventory";
export async function test_api_product_availability_status_check(
  connection: api.IConnection,
): Promise<void> {
  // Generate realistic UUIDs for productId and availabilityId
  const productId = typia.random<string & tags.Format<"uuid">>();
  const availabilityId = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint with generated IDs
  const availabilityStatus: IShoppingMallProductVariantInventory =
    await api.functional.shoppingMall.products.availabilities.patchByProductidAndAvailabilityid(
      connection,
      {
        productId,
        availabilityId,
      },
    );
  // Validate the response structure using typia.assert()
  // This validates ALL properties including:
  // - quantity (non-negative int32)
  // - low_stock_threshold (non-negative int32)
  // - backorder_allowed (boolean)
  // - availability_status (one of: green, yellow, red, gray)
  // - min_order_quantity (positive int32)
  // - max_order_quantity (zero or positive int32)
  typia.assert(availabilityStatus);
}
