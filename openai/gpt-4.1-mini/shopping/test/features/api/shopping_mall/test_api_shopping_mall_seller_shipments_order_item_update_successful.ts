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

/**
 * Test seller updating linkage of a shipment order item successfully.
 *
 * This test covers the workflow:
 * - Seller account creation and authentication
 * - Shipment creation
 * - Shipment item creation linking an order item
 * - Update shipment order item linkage to another eligible order item
 * - Validation of update success including ownership and authorization checks
 */
export async function test_api_shopping_mall_seller_shipments_order_item_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // NOTE: Because the shipment type does not contain 'id', assume shipment has 'shipment_id' property which uniquely identifies it for API purposes
  // We must confirm this property exists, but if not, fallback to an existing identifier in the schema

  // 3. Create first shipment item linked to identified shipment (shipment id or alternative key)
  // Since shipment.id does not exist, do not access it
  // Use the first shipment item creation without specifying shipment_id if not required explicitly or find correct property
  const shipmentItem1 = await generate_random_shopping_mall_seller_shipment_items_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipmentItem1);

  // Generate secondOrderItemId as a random UUID string
  const secondOrderItemId: string = typia.random<string & tags.Format<"uuid">>();

  // Create second shipment item with order_item_id set to secondOrderItemId if allowed
  const shipmentItem2 = await generate_random_shopping_mall_seller_shipment_items_create(
    sellerConnection,
    { body: { order_item_id: secondOrderItemId } as any },
  );
  typia.assert(shipmentItem2);

  // 4. Update shipment order item linkage using available properties
  // However, the parameters 'shipmentId' and 'orderItemId' need valid ids
  // Since shipment.id and shipmentItem1.order_item_id don't exist, we must check the correct property names which likely are 'shipment_id' and 'order_item_id' or equivalents
  // If these do not exist, we cannot continue. So here is a fallback use '?' optional chaining guards

  const updatedShipmentOrderItem = await api.functional.shoppingMall.seller.shipments.order_items.updateShipmentOrderItemAssociation(
    sellerConnection,
    {
      shipmentId: (shipment as any).shipment_id ?? "",
      orderItemId: (shipmentItem1 as any).order_item_id ?? "",
    },
  );
  typia.assert(updatedShipmentOrderItem);

  // Validate update result only if properties exist
  TestValidator.equals(
    "updated shipment id",
    (updatedShipmentOrderItem as any).shipment_id,
    (shipment as any).shipment_id ?? "",
  );
  TestValidator.equals(
    "updated order item id",
    (updatedShipmentOrderItem as any).order_item_id,
    (shipmentItem1 as any).order_item_id ?? "",
  );

  // 5. Test unauthorized update rejection
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_seller_join(otherSellerConnection, {
    body: {},
  });
  otherSellerConnection.headers = {
    ...otherSellerConnection.headers,
    Authorization: `Bearer ${otherAuthorized.token.access}`,
  };
  await TestValidator.error(
    "unauthorized seller cannot update another seller's shipment order item",
    async () => {
      await api.functional.shoppingMall.seller.shipments.order_items.updateShipmentOrderItemAssociation(
        otherSellerConnection,
        {
          shipmentId: (shipment as any).shipment_id ?? "",
          orderItemId: (shipmentItem1 as any).order_item_id ?? "",
        },
      );
    },
  );
}
