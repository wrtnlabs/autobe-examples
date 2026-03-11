import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_creation_single_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerResponse);
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IEcommerceMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  const customerLogin = {
    email: customerData.email,
    password: customerData.password,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies IEcommerceMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: customerLogin,
  });
  // 3. Create order with seller's products
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 4. Get seller's order items
  const orderItems = await api.functional.ecommerceMall.seller.orders.items.at(
    sellerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderItems);
  // Filter items belonging to this seller
  const sellerItems = orderItems.data.filter(
    (item) => item.seller.id === sellerResponse.id,
  );
  // Verify seller has items in the order
  TestValidator.predicate("seller has items in order", sellerItems.length > 0);
  // 5. Create shipment with seller's order items
  const shipmentData = {
    order_items: sellerItems.map((item) => item.id),
    carrier_name: "Kuroneko Yamato",
    tracking_number: RandomGenerator.alphaNumeric(12),
  } satisfies IEcommerceMallShipment.ICreate;
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: shipmentData,
      },
    );
  typia.assert(shipment);
  // 6. Validate shipment record
  TestValidator.equals(
    "shipment seller matches",
    shipment.seller.id,
    sellerResponse.id,
  );
  TestValidator.equals("shipment order matches", shipment.order.id, order.id);
  TestValidator.equals(
    "carrier name stored",
    shipment.carrier_name,
    shipmentData.carrier_name,
  );
  TestValidator.equals(
    "tracking number stored",
    shipment.tracking_number,
    shipmentData.tracking_number,
  );
  TestValidator.predicate(
    "shipment has items",
    (shipment.shipment_item_count ?? 0) > 0,
  );
}