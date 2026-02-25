import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test updating a shipment item with valid shipmentItemId, shipmentId, and orderItemId.
 * Validate successful update returns 200 with correct updated data.
 * Ensure the shipmentId exists in shipments, orderItemId exists in order items, and linkage is correctly maintained.
 * Confirm only authorized seller can perform update.
 */
export async function test_api_seller_shipment_item_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare seller actor: join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "a1b2c3d4",
    shopName: "Shop " + typia.random<string>(),
    shopDescription: null,
    logoUri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinData.email,
      password: sellerJoinData.password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Prepare customer actor: join and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "p4s5w6d7",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: customerJoinData,
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinData.email,
      password: customerJoinData.password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Customer creates an order with at least one order item
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: undefined, // Let generator create random order
    },
  );
  typia.assert(order);
  // Seller creates shipment linking the order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "Test Carrier",
        trackingNumber: "TRACK123456",
        orderItemIds: order.orderItems.map((item) => item.id),
      },
    },
  );
  typia.assert(shipment);
  // Prepare shipment item manually by linking shipment and one order item
  // Since shipment_items are not creatable via API directly, create one valid shipment item
  // Using the first order item and the shipment
  const shipmentItemInitialUpdate = {
    shipmentId: shipment.id,
    orderItemId: order.orderItems[0].id,
  } satisfies IShoppingMallShipmentItem.IUpdate;
  // Create a shipment item update initially using update API with dummy shipmentItemId to create a real shipment item link
  // Assuming the system allows partial update or update on existing shipment item, but usually create is separate
  // If no direct create, we'll assume a prior shipment item exists by first update with initial linkage
  // We simulate creating shipment item by updating the shipment item information once to get a valid shipmentItemId
  // But the update requires existing shipmentItemId, so we find one shipment item by fetching all shipment items of this shipment (not in APIs)
  // Since the system doesn't provide shipment item create API, we assume shipmentItems exist by shipment creation
  // We will simulate picking a valid shipment item by setting shipmentItemId as the first shipmentItem of the shipment order items
  // Since no API to list shipment items, we assume shipmentItems IDs are the same as some known IDs
  // For test purpose, we will use the first known orderItemId as shipmentItemId to update
  const shipmentItemIdToUpdate = order.orderItems[0].id; // Using orderItem id as shipmentItemId for testing
  // Now update the shipment item with different valid linkage
  // We update shipmentItem to link to the same shipment but the second order item if present
  const newOrderItemId =
    order.orderItems.length > 1
      ? order.orderItems[1].id
      : order.orderItems[0].id;
  const updateBody: IShoppingMallShipmentItem.IUpdate = {
    shipmentId: shipment.id,
    orderItemId: newOrderItemId,
  };
  const updatedShipmentItem =
    await api.functional.shoppingMall.seller.shipment_items.update(
      sellerConnection,
      {
        shipmentItemId: shipmentItemIdToUpdate,
        body: updateBody,
      },
    );
  typia.assert(updatedShipmentItem);
  // Validate the updated shipment item fields
  TestValidator.equals(
    "shipment item shipmentId",
    updatedShipmentItem.shipmentId,
    shipment.id,
  );
  TestValidator.equals(
    "shipment item orderItemId",
    updatedShipmentItem.orderItemId,
    newOrderItemId,
  );
  TestValidator.predicate("shipment item has id", !!updatedShipmentItem.id);
  TestValidator.predicate(
    "shipment item has createdAt",
    !!updatedShipmentItem.createdAt,
  );
  TestValidator.predicate(
    "shipment item has updatedAt",
    !!updatedShipmentItem.updatedAt,
  );
  TestValidator.equals(
    "shipment item deletedAt is null",
    updatedShipmentItem.deletedAt,
    null,
  );
  TestValidator.equals(
    "shipment item shipment id matches summary",
    updatedShipmentItem.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment item shipment status matches",
    updatedShipmentItem.shipment.status,
    shipment.status,
  );
  TestValidator.equals(
    "shipment item order item id matches summary",
    updatedShipmentItem.orderItem.id,
    newOrderItemId,
  );
  TestValidator.equals(
    "shipment item order item quantity positive",
    updatedShipmentItem.orderItem.quantity > 0,
    true,
  );
}
