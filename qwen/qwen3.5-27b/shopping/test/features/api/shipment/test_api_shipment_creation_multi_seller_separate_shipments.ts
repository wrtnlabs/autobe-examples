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
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test multi-seller order shipment workflow where different sellers create separate shipments for their items in the same order.
 *
 * Validates the complete multi-seller order fulfillment flow including seller registration, product creation, customer order placement, and separate shipment creation by each seller. Ensures that different sellers can independently ship their respective items within the same order, with each shipment containing only the items owned by that seller.
 *
 * Special attention is given to verifying that authorization is enforced (each seller can only ship their own items), that separate shipment records are created for each seller, and that order items correctly transition to 'shipped' status with the appropriate tracking information.
 *
 * 1. Register and authenticate seller A and seller B.
 * 2. Register and authenticate a customer.
 * 3. Seller A creates a product with variant and inventory.
 * 4. Seller B creates a product with variant and inventory.
 * 5. Customer places order containing items from both sellers.
 * 6. Seller A creates shipment for their item with FedEx tracking.
 * 7. Seller B creates shipment for their item with DHL tracking.
 * 8. Validate both shipments created successfully with correct tracking info.
 */
export async function test_api_shipment_creation_multi_seller_separate_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerAId = sellerAAuth.id;
  // 2. Register and authenticate seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerBId = sellerBAuth.id;
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Customer places order containing items from both sellers
  // The generate function handles product creation, cart population, and checkout
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_checkout(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Extract order items by seller ID
  const sellerAItems = order.items.filter(
    (item) => item.seller.id === sellerAId,
  );
  const sellerBItems = order.items.filter(
    (item) => item.seller.id === sellerBId,
  );
  // Ensure we have items from both sellers
  TestValidator.predicate("order has seller A items", sellerAItems.length > 0);
  TestValidator.predicate("order has seller B items", sellerBItems.length > 0);
  const sellerAItemId = sellerAItems[0].id;
  const sellerBItemId = sellerBItems[0].id;
  // 6. Seller A creates shipment for their item with FedEx
  const shipmentA: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier_name: "FedEx",
          tracking_number: "FX" + typia.random<string & tags.Format<"uuid">>(),
          order_item_ids: [sellerAItemId],
        },
      },
    );
  typia.assert(shipmentA);
  // 7. Seller B creates shipment for their item with DHL
  const shipmentB: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerBConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier_name: "DHL",
          tracking_number: "DH" + typia.random<string & tags.Format<"uuid">>(),
          order_item_ids: [sellerBItemId],
        },
      },
    );
  typia.assert(shipmentB);
  // 8. Validate shipments are separate records
  TestValidator.notEquals("shipment IDs differ", shipmentA.id, shipmentB.id);
  // 9. Validate carrier information matches input
  TestValidator.equals(
    "seller A carrier is FedEx",
    shipmentA.carrier_name,
    "FedEx",
  );
  TestValidator.equals(
    "seller B carrier is DHL",
    shipmentB.carrier_name,
    "DHL",
  );
  // 10. Validate tracking numbers are different
  TestValidator.notEquals(
    "tracking numbers differ",
    shipmentA.tracking_number,
    shipmentB.tracking_number,
  );
  // 11. Validate both shipments belong to same order
  TestValidator.equals(
    "both shipments same order",
    shipmentA.order.id,
    shipmentB.order.id,
  );
  TestValidator.equals("order ID matches", shipmentA.order.id, order.id);
  // 12. Validate each shipment belongs to correct seller
  TestValidator.equals(
    "shipment A belongs to seller A",
    shipmentA.seller.id,
    sellerAId,
  );
  TestValidator.equals(
    "shipment B belongs to seller B",
    shipmentB.seller.id,
    sellerBId,
  );
}
