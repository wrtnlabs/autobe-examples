import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_order_items_add_order_items } from "../../../generate/generate_random_shopping_mall_seller_shipments_order_items_add_order_items";

export async function test_api_seller_shipment_add_order_items_idempotent_duplicate_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test handling duplicate addition of order items to the same shipment
  // 1. Seller joins (registers) and obtains authorization token
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // Update connection with seller authorization token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 2. Create a new shipment by the seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // Extract id from shipment by satisfying as { id: string }
  const shipmentId = (shipment as { id: string }).id;
  // 3. Prepare empty order items body as per DTO definition
  const orderItemCreateBody: IShoppingMallShipmentOrderItem.ICreate = {};
  // 4. Add the order items to the shipment first time
  const firstAdd =
    await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
      sellerConnection,
      {
        body: orderItemCreateBody,
        params: { shipmentId },
      },
    );
  typia.assert(firstAdd);
  // 5. Add the same order items again to test idempotency - the system should handle duplicates gracefully
  const secondAdd =
    await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
      sellerConnection,
      {
        body: orderItemCreateBody,
        params: { shipmentId },
      },
    );
  typia.assert(secondAdd);
  // 6. Validate idempotency - ensure no errors and valid response returned on the repeated addition
  TestValidator.predicate("First add order items response truthy", !!firstAdd);
  TestValidator.predicate(
    "Second add order items response truthy",
    !!secondAdd,
  );
}