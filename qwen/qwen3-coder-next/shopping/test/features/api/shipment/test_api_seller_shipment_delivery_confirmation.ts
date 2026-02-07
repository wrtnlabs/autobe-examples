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

export async function test_api_seller_shipment_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Authentication as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerConnection.headers?.Authorization ?? "",
      password: "password123",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerConnection.headers?.Authorization ?? "",
      password: "password123",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 5. Create order using generate function
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        items: [
          {
            product_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
            price: 10000,
            seller_id: typia.random<string & tags.Format<"uuid">>(),
          },
        ],
        shipping_address: {
          recipient_name: RandomGenerator.name(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphabets(5),
          country: "Korea",
        },
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Create shipment using generate function
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_id: (
          order as IShoppingMallOrder & {
            id: string;
          }
        ).id,
        carrier_name: "Korea Express",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 7. Update shipment with delivery confirmation
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.putById(
      sellerLoginConnection,
      {
        id: (
          shipment as IShoppingMallShipment & {
            id: string;
          }
        ).id,
        body: {
          status: "delivered" as const,
          customer_confirmed_delivery: true,
          delivered_at: new Date().toISOString(),
        } satisfies IShoppingMallShipment.IUpdate & {
          status?: string;
          customer_confirmed_delivery?: boolean;
          delivered_at?: string;
        },
      },
    );
  typia.assert(updatedShipment);
  // 8. Validate delivery confirmation
  TestValidator.equals(
    "status is delivered",
    (
      updatedShipment as IShoppingMallShipment & {
        status?: string;
      }
    ).status,
    "delivered",
  );
  TestValidator.equals(
    "customer confirmed delivery",
    (
      updatedShipment as IShoppingMallShipment & {
        customer_confirmed_delivery?: boolean;
      }
    ).customer_confirmed_delivery,
    true,
  );
  TestValidator.predicate(
    "has delivered_at",
    (
      updatedShipment as IShoppingMallShipment & {
        delivered_at?: string;
      }
    ).delivered_at !== null,
  );
}
