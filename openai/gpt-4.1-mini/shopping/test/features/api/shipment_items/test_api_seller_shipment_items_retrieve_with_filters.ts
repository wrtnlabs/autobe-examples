import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_items_retrieve_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Seller registration and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "SellerPass123!";
  const sellerJoinOutput = await authorize_seller_join(sellerJoinConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerJoinOutput);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginOutput = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: { email: sellerJoinOutput.email, password: sellerPassword },
    },
  );
  typia.assert(sellerLoginOutput);
  // Customer registration and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerPassword = "CustomerPass123!";
  const customerJoinOutput = await authorize_customer_join(
    customerJoinConnection,
    {
      body: { password: customerPassword },
    },
  );
  typia.assert(customerJoinOutput);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginOutput = await authorize_customer_login(
    customerLoginConnection,
    {
      body: { email: customerJoinOutput.email, password: customerPassword },
    },
  );
  typia.assert(customerLoginOutput);
  // Create multiple order items as customer
  const orderItems: IShoppingMallOrderItem[] = [];
  for (let i = 0; i < 3; i++) {
    const orderItem =
      await generate_random_shopping_mall_customer_order_items_create(
        customerLoginConnection,
        { body: {} },
      );
    typia.assert(orderItem);
    orderItems.push(orderItem);
  }
  // Create shipments linked to order items as seller
  const shipments: IShoppingMallShipment[] = [];
  for (let i = 0; i < 2; i++) {
    const shipment =
      await generate_random_shopping_mall_seller_shipments_create(
        sellerLoginConnection,
        {
          body: {
            carrierName: `Carrier ${i + 1}`,
            trackingNumber: `TRACK${i + 1}`,
            orderItemIds: [orderItems[i].id],
          },
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // Retrieve shipment items filtered by shipmentId and orderItemId
  const filterShipmentId = shipments[0].id;
  const filterOrderItemId = orderItems[0].id;
  const shipmentItemsPage =
    await generate_random_shopping_mall_seller_shipments_create;
  // Actually call the utility function to retrieve shipment items filtered
  const shipmentItemsResponse =
    await api.functional.shoppingMall.seller.shipment_items.index(
      sellerLoginConnection,
      {
        body: {
          shipmentId: filterShipmentId,
          orderItemId: filterOrderItemId,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(shipmentItemsResponse);
  // Check shipment items belong only to specified shipment and order item
  shipmentItemsResponse.data.forEach((item) => {
    TestValidator.equals(
      "shipment ID should match",
      item.shipment_id,
      filterShipmentId,
    );
    TestValidator.equals(
      "order item ID should match",
      item.order_item_id,
      filterOrderItemId,
    );
    // Ensure shipment belongs to the logged-in seller
    TestValidator.equals(
      "shipment belongs to seller",
      item.shipment.seller.id,
      sellerLoginOutput.id,
    );
  });
  // Validate pagination details
  TestValidator.equals(
    "pagination current page",
    shipmentItemsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is within requested limit",
    shipmentItemsResponse.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    shipmentItemsResponse.pagination.records >=
      shipmentItemsResponse.data.length,
  );
}
