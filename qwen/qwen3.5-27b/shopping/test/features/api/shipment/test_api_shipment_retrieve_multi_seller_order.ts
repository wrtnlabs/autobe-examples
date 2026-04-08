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
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can retrieve shipment information when an order contains items from multiple sellers, each with separate shipments.
 *
 * Validates the complete multi-seller order shipment retrieval flow including customer authentication, two seller account registrations, product creation by each seller, order placement with items from both sellers, and independent shipment creation by each seller. Ensures that the customer can retrieve shipment details for both shipments and that each shipment correctly references its respective seller while belonging to the same order.
 *
 * Special attention is given to verifying that multi-seller orders are processed correctly with independent shipments, each with unique tracking information, and that the order reference is consistent across both shipments.
 *
 * 1. Customer registers and authenticates.
 * 2. First seller registers and authenticates.
 * 3. Second seller registers and authenticates.
 * 4. First seller creates a product.
 * 5. Second seller creates a product.
 * 6. Customer places an order with items from both sellers.
 * 7. First seller creates a shipment for their order items.
 * 8. Second seller creates a shipment for their order items.
 * 9. Customer retrieves the first shipment and validates seller reference and order ID.
 * 10. Customer retrieves the second shipment and validates seller reference and order ID.
 * 11. Validates both shipments have unique tracking information but same order ID.
 */
export async function test_api_shipment_retrieve_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. First seller registration and authentication
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1Auth);
  // 3. Second seller registration and authentication
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2Auth);
  // 4. First seller creates a product
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product1);
  // 5. Second seller creates a product
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {},
  );
  typia.assert(product2);
  // 6. Customer places an order with items from both sellers
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. First seller creates a shipment for their order items
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    seller1Connection,
    {
      body: {
        order_id: order.id,
        carrier_name: "FedEx",
        tracking_number: `TRACK1-${typia.random<string & tags.Format<"uuid">>()}`,
        order_item_ids: order.items
          .filter((item) => item.seller.id === seller1Auth.id)
          .map((item) => item.id),
      },
    },
  );
  typia.assert(shipment1);
  // 8. Second seller creates a shipment for their order items
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    seller2Connection,
    {
      body: {
        order_id: order.id,
        carrier_name: "UPS",
        tracking_number: `TRACK2-${typia.random<string & tags.Format<"uuid">>()}`,
        order_item_ids: order.items
          .filter((item) => item.seller.id === seller2Auth.id)
          .map((item) => item.id),
      },
    },
  );
  typia.assert(shipment2);
  // 9. Customer retrieves the first shipment
  const retrievedShipment1 =
    await api.functional.shoppingMall.customer.shipments.at(
      customerConnection,
      {
        shipmentId: shipment1.id,
      },
    );
  typia.assert(retrievedShipment1);
  // 10. Customer retrieves the second shipment
  const retrievedShipment2 =
    await api.functional.shoppingMall.customer.shipments.at(
      customerConnection,
      {
        shipmentId: shipment2.id,
      },
    );
  typia.assert(retrievedShipment2);
  // 11. Validate first shipment seller reference
  TestValidator.equals(
    "first shipment seller matches seller1",
    retrievedShipment1.seller.id,
    seller1Auth.id,
  );
  // 12. Validate second shipment seller reference
  TestValidator.equals(
    "second shipment seller matches seller2",
    retrievedShipment2.seller.id,
    seller2Auth.id,
  );
  // 13. Validate both shipments belong to the same order
  TestValidator.equals(
    "both shipments reference same order",
    retrievedShipment1.order.id,
    retrievedShipment2.order.id,
  );
  // 14. Validate both shipments have the same order ID as the created order
  TestValidator.equals(
    "shipment order matches created order",
    retrievedShipment1.order.id,
    order.id,
  );
  // 15. Validate shipments have unique tracking numbers
  TestValidator.notEquals(
    "shipments have unique tracking numbers",
    retrievedShipment1.tracking_number,
    retrievedShipment2.tracking_number,
  );
  // 16. Validate shipments have unique carrier names
  TestValidator.notEquals(
    "shipments have different carriers",
    retrievedShipment1.carrier_name,
    retrievedShipment2.carrier_name,
  );
  // 17. Validate shipment seller IDs are different
  TestValidator.notEquals(
    "shipments from different sellers",
    retrievedShipment1.seller.id,
    retrievedShipment2.seller.id,
  );
}
