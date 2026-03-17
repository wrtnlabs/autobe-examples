import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that attempting to retrieve a non-existent shipment returns 404 Not Found.
 *
 * This test validates error handling when a seller requests a shipment
 * with a UUID that does not correspond to any shipment in the system.
 *
 * Steps:
 * 1. Create seller connection and authenticate using utility function
 * 2. Generate a random UUID for a non-existent shipment
 * 3. Attempt to retrieve the non-existent shipment
 * 4. Validate that 404 error is returned
 */
export async function test_api_shipment_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection (connection isolation pattern)
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller using utility function (PRIORITY over SDK)
  await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  // Generate a random UUID that does not exist in the system
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent shipment - expect 404 error
  await TestValidator.httpError("shipment not found", 404, async () => {
    await api.functional.shoppingMall.seller.shipments.at(sellerConnection, {
      shipmentId: nonExistentShipmentId,
    });
  });
}
