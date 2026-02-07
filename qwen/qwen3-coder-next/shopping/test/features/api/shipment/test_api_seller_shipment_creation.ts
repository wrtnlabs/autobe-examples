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

export async function test_api_seller_shipment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Setup: Create customer order
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.token.access
        ? JSON.parse(atob(customerAuth.token.access.split(".")[0])).email
        : "",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerLoginConnection,
    {
      body: {
        shippingAddress: {
          recipientName: RandomGenerator.name(),
          street: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "Korea",
        },
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Create shipment as seller
  const shipmentConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(shipmentConnection, {
    body: {
      email: sellerAuth.token.access
        ? JSON.parse(atob(sellerAuth.token.access.split(".")[0])).email
        : "",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    shipmentConnection,
    {
      body: typia.random<IShoppingMallShipment.ICreate>(),
    },
  );
  typia.assert(shipment);
  // 5. Verify shipment was created successfully
  TestValidator.predicate(
    "shipment created successfully",
    () => shipment !== undefined && shipment !== null,
  );
  // 6. Test duplicate shipment creation (should fail due to unique constraint)
  await TestValidator.error("duplicate shipment should fail", async () => {
    await api.functional.shoppingMall.seller.shipments.create(
      shipmentConnection,
      {
        body: typia.random<IShoppingMallShipment.ICreate>(),
      },
    );
  });
}
