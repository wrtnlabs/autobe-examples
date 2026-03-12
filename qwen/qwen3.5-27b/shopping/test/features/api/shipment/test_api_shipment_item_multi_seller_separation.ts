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

export async function test_api_shipment_item_multi_seller_separation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Setup: Create Seller A account
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: "sellerA@test.com",
      password: "1234",
      shop_name: "Seller A Shop",
      shop_description: "Seller A's shop description",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Setup: Create Seller B account
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: "sellerB@test.com",
      password: "1234",
      shop_name: "Seller B Shop",
      shop_description: "Seller B's shop description",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 5. Customer creates order with items (may be from multiple sellers)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 6. Group order items by seller
  const sellerMap = new Map<string, IShoppingMallOrderItem[]>();
  for (const item of order.orderItems) {
    const items = sellerMap.get(item.sellerId) || [];
    items.push(item);
    sellerMap.set(item.sellerId, items);
  }
  // 7. Get unique seller IDs
  const sellerIds = Array.from(sellerMap.keys());
  // 8. Create shipments for each seller
  const shipments: IShoppingMallShipment[] = [];
  const carrierNames = ["FedEx", "UPS", "DHL", "EMS"] as const;
  for (let i = 0; i < sellerIds.length; i++) {
    const sellerId = sellerIds[i];
    const sellerItems = sellerMap.get(sellerId)!;
    const carrier = carrierNames[i % carrierNames.length];
    // Create shipment for this seller's items
    const shipment =
      await generate_random_shopping_mall_seller_sellers_me_shipments_create(
        i === 0 ? sellerAConnection : sellerBConnection,
        {
          body: {
            order_item_ids: sellerItems.map((item) => item.id),
            tracking_carrier: carrier,
            tracking_number: carrier + RandomGenerator.alphaNumeric(12),
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // 9. Validate each shipment contains only items from one seller
  for (const shipment of shipments) {
    const firstItemSellerId = shipment.orderItems[0].sellerId;
    // All items in this shipment must have the same seller_id
    for (const item of shipment.orderItems) {
      TestValidator.equals(
        `Shipment ${shipment.id} contains only ${firstItemSellerId}'s items`,
        item.sellerId,
        firstItemSellerId,
      );
    }
  }
  // 10. If we have multiple sellers, validate separation
  if (sellerIds.length >= 2) {
    const sellerAShipment = shipments[0];
    const sellerBShipment = shipments[1];
    // Validate different sellers
    TestValidator.notEquals(
      "Different sellers in multi-seller order",
      sellerAShipment.orderItems[0].sellerId,
      sellerBShipment.orderItems[0].sellerId,
    );
    // Admin retrieves order items from each shipment
    const sellerAOrderItem =
      await api.functional.shoppingMall.admin.shipments.items.at(
        adminConnection,
        {
          shipmentId: sellerAShipment.id,
          itemId: sellerAShipment.orderItems[0].id,
        },
      );
    typia.assert(sellerAOrderItem);
    const sellerBOrderItem =
      await api.functional.shoppingMall.admin.shipments.items.at(
        adminConnection,
        {
          shipmentId: sellerBShipment.id,
          itemId: sellerBShipment.orderItems[0].id,
        },
      );
    typia.assert(sellerBOrderItem);
    // Validate seller_id matches in admin response
    TestValidator.equals(
      "Admin view: Seller A item seller_id matches",
      sellerAOrderItem.sellerId,
      sellerAShipment.orderItems[0].sellerId,
    );
    TestValidator.equals(
      "Admin view: Seller B item seller_id matches",
      sellerBOrderItem.sellerId,
      sellerBShipment.orderItems[0].sellerId,
    );
  }
  // 11. Validate tracking information is correctly associated
  for (const shipment of shipments) {
    TestValidator.predicate(
      `Shipment ${shipment.id} has tracking carrier`,
      shipment.tracking_carrier.length > 0,
    );
    TestValidator.predicate(
      `Shipment ${shipment.id} has tracking number`,
      shipment.tracking_number.length > 0,
    );
  }
  // 12. Validate snapshots are preserved for all order items
  for (const shipment of shipments) {
    for (const item of shipment.orderItems) {
      TestValidator.predicate(
        `Item ${item.id} has product snapshot`,
        item.productSnapshot.length > 0,
      );
      TestValidator.predicate(
        `Item ${item.id} has variant snapshot`,
        item.variantSnapshot.length > 0,
      );
      TestValidator.predicate(
        `Item ${item.id} has seller profile snapshot`,
        item.sellerProfileSnapshot.length > 0,
      );
    }
  }
  // 13. Validate order items status updated to shipped
  for (const shipment of shipments) {
    for (const item of shipment.orderItems) {
      TestValidator.equals(
        `Item ${item.id} status is shipped after shipment creation`,
        item.status,
        "shipped",
      );
    }
  }
}