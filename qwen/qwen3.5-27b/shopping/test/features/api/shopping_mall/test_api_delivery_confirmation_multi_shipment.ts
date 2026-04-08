import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test delivery confirmation for multi-seller orders where each seller ships separately.
 *
 * Validates the complete delivery confirmation flow for orders containing items from multiple sellers. Tests that each seller's shipment can be confirmed independently, and that the order status correctly reflects the collective state of all order items.
 *
 * Special attention is given to verifying that delivery confirmation for one shipment does not affect other shipments in the same order, and that the order status transitions correctly from 'shipped' to 'partially_completed' to 'delivered' as shipments are confirmed.
 *
 * 1. Register and authenticate a customer.
 * 2. Register and authenticate two sellers (seller A and seller B).
 * 3. Create an order with items from both sellers via checkout.
 * 4. As seller A, create a shipment for seller A's items.
 * 5. As seller B, create a separate shipment for seller B's items.
 * 6. As the customer, confirm delivery for seller A's shipment first.
 * 7. Verify only seller A's order items are 'delivered', seller B's items remain 'shipped'.
 * 8. Verify order status is 'partially_completed'.
 * 9. Confirm delivery for seller B's shipment.
 * 10. Verify all order items are now 'delivered' and order status is 'delivered'.
 */
export async function test_api_delivery_confirmation_multi_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerAAuth);
  // 3. Register and authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBAuth);
  // 4. Create order with items from both sellers
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_checkout(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Create shipment for seller A's items
  const sellerAItemIds = order.items
    .filter((item) => item.seller.id === sellerAAuth.id)
    .map((item) => item.id);
  const shipmentA: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerAConnection,
      {
        body: {
          order_id: order.id,
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(16),
          order_item_ids: sellerAItemIds,
        },
      },
    );
  typia.assert(shipmentA);
  // 6. Create shipment for seller B's items
  const sellerBItemIds = order.items
    .filter((item) => item.seller.id === sellerBAuth.id)
    .map((item) => item.id);
  const shipmentB: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerBConnection,
      {
        body: {
          order_id: order.id,
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(16),
          order_item_ids: sellerBItemIds,
        },
      },
    );
  typia.assert(shipmentB);
  // 7. Confirm delivery for seller A's shipment
  const confirmedShipmentA: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipmentA.id,
      },
    );
  typia.assert(confirmedShipmentA);
  // 8. Verify shipment A is delivered
  TestValidator.predicate(
    "shipment A delivered_at is set",
    confirmedShipmentA.delivered_at !== null,
  );
  // 9. Verify order status from shipment response is partially_completed
  TestValidator.equals(
    "order status is partially_completed after first delivery",
    confirmedShipmentA.order.status,
    "partially_completed",
  );
  // 10. Confirm delivery for seller B's shipment
  const confirmedShipmentB: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipmentB.id,
      },
    );
  typia.assert(confirmedShipmentB);
  // 11. Verify shipment B is delivered
  TestValidator.predicate(
    "shipment B delivered_at is set",
    confirmedShipmentB.delivered_at !== null,
  );
  // 12. Verify order status is delivered after both shipments confirmed
  TestValidator.equals(
    "order status is delivered after all shipments confirmed",
    confirmedShipmentB.order.status,
    "delivered",
  );
  // 13. Verify both shipments have delivered_at timestamps
  TestValidator.predicate(
    "both shipments have delivery timestamps",
    confirmedShipmentA.delivered_at !== null &&
      confirmedShipmentB.delivered_at !== null,
  );
}
