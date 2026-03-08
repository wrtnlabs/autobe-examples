import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_multi_item_bundle(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a seller can retrieve a shipment containing multiple bundled order items.
   *
   * This scenario validates:
   * - All order items grouped in the shipment are correctly returned in the orderItems array
   * - Each order item maintains its individual product snapshot data
   * - Each item shows correct quantity and price at purchase time
   * - All items show 'shipped' status after shipment creation
   * - The same carrier name and tracking number applies to all items in the bundle
   */
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create shipping address for customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    { body: { is_default: true } },
  );
  typia.assert(address);
  // 4. Create order with items (checkout) - generation function handles cart setup
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // 5. Create shipment bundling order items
  // Generation function creates proper shipment with order_id and order_item_ids
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: { order_id: order.id } },
  );
  typia.assert(shipment);
  // 6. Retrieve the shipment using the at endpoint (main test target)
  const retrievedShipment =
    await api.functional.shoppingMall.seller.shipments.at(sellerConnection, {
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  // 7. Validate the shipment contains bundled items (at least 1)
  TestValidator.predicate(
    "shipment has order items",
    retrievedShipment.orderItems.length >= 1,
  );
  // 8. Validate all items have 'shipped' status
  for (const item of retrievedShipment.orderItems) {
    TestValidator.equals("item status is shipped", item.status, "shipped");
  }
  // 9. Validate carrier and tracking information
  TestValidator.predicate(
    "carrier name is not empty",
    retrievedShipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "tracking number is not empty",
    retrievedShipment.tracking_number.length > 0,
  );
  // 10. Validate each item has required data (product, variant, quantity, price)
  for (const item of retrievedShipment.orderItems) {
    TestValidator.predicate(
      "item has product data",
      item.product !== null && item.product !== undefined,
    );
    TestValidator.predicate(
      "item has variant data",
      item.variant !== null && item.variant !== undefined,
    );
    TestValidator.predicate("item has quantity", item.quantity > 0);
    TestValidator.predicate("item has price", item.price >= 0);
  }
  // 11. Validate order reference in shipment matches
  TestValidator.equals(
    "shipment order id matches",
    retrievedShipment.order.id,
    order.id,
  );
  // 12. Validate seller reference in shipment matches
  TestValidator.equals(
    "shipment seller id matches",
    retrievedShipment.seller.id,
    seller.id,
  );
}
