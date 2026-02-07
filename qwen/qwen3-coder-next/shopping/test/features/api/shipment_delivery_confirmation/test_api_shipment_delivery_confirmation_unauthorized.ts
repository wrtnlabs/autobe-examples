import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_delivery_confirmation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create authenticated customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Generate UUIDs for order and shipment since DTOs have minimal type definitions
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Customer A places an order (the API will accept any valid IShoppingMallOrder.ICreate)
  await api.functional.shoppingMall.customer.orders.create(
    customerAConnection,
    {
      body: {
        shipping_address: {
          recipient_name: RandomGenerator.name(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postal_code: typia.random<string & tags.Pattern<"^[0-9]{5}$">>(),
          country: "USA",
        },
        items: [
          {
            product_id: typia.random<string & tags.Format<"uuid">>(),
            variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
            unit_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<100>
            >(),
          },
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  // Seller creates shipment for Customer A's order using the generated IDs
  await api.functional.shoppingMall.seller.shipments.create(sellerConnection, {
    body: {
      order_item_id: orderId,
      carrier_name: RandomGenerator.name(),
      tracking_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallShipment.ICreate,
  });
  // Update shipment status to shipped
  await api.functional.shoppingMall.seller.shipments.patchByShipmentid(
    sellerConnection,
    {
      shipmentId,
      body: {
        status: "shipped",
      } satisfies IShoppingMallShipment.IUpdate,
    },
  );
  // Create authenticated customer B (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Customer B attempts to confirm delivery of Customer A's shipment
  // This should fail with unauthorized error
  await TestValidator.error(
    "customer B cannot confirm delivery of customer A's shipment",
    async () => {
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.patchByShipmentid(
        customerBConnection,
        {
          shipmentId,
        },
      );
    },
  );
}
