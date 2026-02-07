import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_requests_create_cancellation_request";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_creation_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Authorize as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // 3. Create an order with at least one item
  // Note: Order creation requires cart items - we'll use minimal valid structure
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // 4. Verify order has items before proceeding
  TestValidator.predicate(
    "order has at least one item",
    (order as any).items.length > 0,
  );
  const orderItem = (order as any).items[0];
  // 5. Create shipment without tracking information
  const shipment =
    await api.functional.shoppingMall.seller.seller.shipments.create(
      sellerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          carrier_name: null,
          tracking_number: null,
          shipping_address: orderItem.shipping_address,
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 6. Verify shipment status is 'pending'
  TestValidator.equals(
    "shipment status is pending",
    (shipment as any).status,
    "pending",
  );
  // 7. Verify tracking fields are null
  TestValidator.equals("carrier_name is null", (shipment as any).carrier_name, null);
  TestValidator.equals(
    "tracking_number is null",
    (shipment as any).tracking_number,
    null,
  );
  // 8. Verify shipping address is correctly copied
  TestValidator.equals(
    "shipping_address matches order",
    (shipment as any).shipping_address,
    orderItem.shipping_address,
  );
}