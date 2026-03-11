import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_order_shipments_multi_seller_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer creates account and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Customer checks out order (this creates order with items from multiple sellers)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 4. Get order items grouped by seller
  const orderItemsBySeller = new Map<
    string,
    (typeof order.orderItems)[number][]
  >();
  for (const item of order.orderItems) {
    const sellerId = item.seller.id;
    if (!orderItemsBySeller.has(sellerId)) {
      orderItemsBySeller.set(sellerId, []);
    }
    orderItemsBySeller.get(sellerId)!.push(item);
  }
  // 5. Create shipments for each seller
  const shipments = [];
  for (const [sellerId, items] of orderItemsBySeller) {
    // Create and authenticate as seller
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {});
    // Create shipment
    const shipment =
      await generate_random_shopping_mall_seller_seller_shipments_create(
        sellerConnection,
        {
          body: {
            orderId: order.id,
            orderItemIds: items.map((item) => item.id),
            carrierName: RandomGenerator.name(),
            trackingNumber: RandomGenerator.alphaNumeric(12),
          },
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // 6. Customer retrieves shipments for the order
  const shipmentsPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(shipmentsPage);
  // Validations
  TestValidator.equals(
    "shipment count",
    shipmentsPage.data.length,
    shipments.length,
  );
  for (const shipment of shipmentsPage.data) {
    TestValidator.predicate(
      "has carrier name",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "has tracking number",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.equals("delivered_at is null", shipment.deliveredAt, null);
    TestValidator.equals(
      "delivery_status is pending",
      shipment.deliveryStatus,
      "pending_delivery",
    );
    TestValidator.predicate(
      "has seller info",
      shipment.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "has order info",
      shipment.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "order items count positive",
      shipment.orderItemsCount > 0,
    );
  }
}
