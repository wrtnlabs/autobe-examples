import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test admin retrieval of shipment order item details.
 *
 * This test validates that an authenticated admin can access detailed information
 * about a specific order item within a shipment. The test creates a complete
 * e-commerce workflow: customer places order, seller creates shipment, admin
 * retrieves shipment item details with all historical snapshots and tracking info.
 */
export async function test_api_shipment_item_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@shipment-test.com",
      password: "AdminPass123!",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
      ip: "192.168.1.100",
    },
  });
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@shipment-test.com",
      password: "CustomerPass123!",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer/join",
      ip: "192.168.1.101",
    },
  });
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@shipment-test.com",
      password: "SellerPass123!",
      shop_name: "Test Shop",
      shop_description: "Test shop for shipment verification",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller/join",
      ip: "192.168.1.102",
    },
  });
  // 4. Customer creates order with order items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Seller creates shipment containing the order item
  const firstOrderItem = order.orderItems[0];
  if (firstOrderItem === undefined) {
    throw new Error("Order has no items for shipment creation");
  }
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [firstOrderItem.id],
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(shipment);
  // 6. Admin retrieves shipment order item details
  const retrievedItem =
    await api.functional.shoppingMall.admin.shipments.items.at(
      adminConnection,
      {
        shipmentId: shipment.id,
        itemId: firstOrderItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 7. Validate complete order item details
  TestValidator.equals("item id matches", retrievedItem.id, firstOrderItem.id);
  TestValidator.equals("order id matches", retrievedItem.orderId, order.id);
  TestValidator.equals(
    "seller id matches",
    retrievedItem.sellerId,
    firstOrderItem.sellerId,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    firstOrderItem.quantity,
  );
  TestValidator.equals(
    "price matches",
    retrievedItem.price,
    firstOrderItem.price,
  );
  // 8. Validate snapshots are included as JSON strings
  TestValidator.predicate(
    "product snapshot exists",
    retrievedItem.productSnapshot.length > 0,
  );
  TestValidator.predicate(
    "variant snapshot exists",
    retrievedItem.variantSnapshot.length > 0,
  );
  TestValidator.predicate(
    "seller profile snapshot exists",
    retrievedItem.sellerProfileSnapshot.length > 0,
  );
  // 9. Validate shipments array contains tracking information
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(retrievedItem.shipments),
  );
  TestValidator.predicate(
    "shipments contains the created shipment",
    retrievedItem.shipments.length > 0,
  );
  const shipmentInItem = retrievedItem.shipments.find(
    (s) => s.id === shipment.id,
  );
  if (shipmentInItem === undefined) {
    throw new Error("Created shipment not found in item's shipments array");
  }
  TestValidator.equals(
    "tracking carrier matches",
    shipmentInItem.tracking_carrier,
    "FedEx",
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentInItem.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "shipped_at exists",
    shipmentInItem.shipped_at !== null,
  );
  TestValidator.predicate(
    "delivery_confirmed is false",
    shipmentInItem.delivery_confirmed === false,
  );
  // 10. Validate order item status is 'shipped'
  TestValidator.equals(
    "item status is shipped",
    retrievedItem.status,
    "shipped",
  );
  // 11. Validate timestamps are present
  TestValidator.predicate(
    "created_at exists",
    retrievedItem.createdAt !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedItem.updatedAt !== null,
  );
  // 12. Validate parent order and seller information
  TestValidator.equals(
    "order id in summary matches",
    retrievedItem.order.id,
    order.id,
  );
  TestValidator.equals(
    "seller id in summary matches",
    retrievedItem.seller.id,
    firstOrderItem.sellerId,
  );
}
