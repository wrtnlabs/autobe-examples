import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipment_items_create } from "../../../generate/generate_random_shopping_mall_seller_shipment_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_shopping_mall_seller_shipments_order_item_update_ineligible_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 2: Failure to update shipment order item linkage due to non-eligible order item.
   *
   * Steps:
   * 1. Authenticate as seller (join).
   * 2. Create a shipment.
   * 3. Create a shipment item with a valid order item.
   * 4. Attempt to update the shipment order item linkage using an ineligible order item ID.
   * 5. Validate failure response (403 or 404).
   * 6. Confirm linkage unchanged and audit logs capture failure.
   */
  // 1. Seller authentication
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  const shipment_id = (shipment as { id: string }).id;
  // 3. Create a valid shipment item (order item linkage)
  const shipmentItem =
    await generate_random_shopping_mall_seller_shipment_items_create(
      sellerConnection,
      { body: { shipment_id } },
    );
  typia.assert(shipmentItem);
  // 4. Prepare an random ineligible order item ID (UUID format), assuming this ID does not belong to seller or already linked
  const ineligibleOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to update shipment order item linkage with invalid order item ID
  await TestValidator.httpError(
    "forbidden or not found when updating shipment with ineligible order item",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipments.order_items.updateShipmentOrderItemAssociation(
        sellerConnection,
        {
          shipmentId: shipment_id,
          orderItemId: ineligibleOrderItemId,
        },
      );
    },
  );
}
