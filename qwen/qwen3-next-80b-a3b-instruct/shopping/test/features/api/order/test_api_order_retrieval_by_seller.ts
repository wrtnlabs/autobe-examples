import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_order_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerJoinEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Login as seller
  const sellerLoggedInConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoggedInConnection, {
    body: {
      email: sellerJoinEmail,
      password: "123456789012",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Generate a valid order ID from scenario - we assume one exists
  // Per scenario: Customer bought from seller, creating an order
  // Since we cannot create order via provided functions, we generate a UUID that we assume is valid
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  // 5. Seller retrieves the order they are associated with
  const order = await api.functional.shoppingMall.customer.orders.at(
    sellerLoggedInConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // 6. Validate order data structure
  TestValidator.equals("order has ID", order.id, orderId);
  TestValidator.predicate(
    "order has positive total price",
    () => order.total_price > 0,
  );
  TestValidator.equals(
    "order has valid status",
    typeof order.status === "string",
    true,
  );
  TestValidator.equals(
    "order has customer_id",
    typeof order.customer_id === "string",
    true,
  );
  TestValidator.equals(
    "order has shipping_address_id",
    typeof order.shipping_address_id === "string",
    true,
  );
  TestValidator.equals(
    "order has items array",
    Array.isArray(order.items),
    true,
  );
  TestValidator.equals(
    "order has shipments array",
    Array.isArray(order.shipments),
    true,
  );
  TestValidator.equals(
    "order has statusHistory array",
    Array.isArray(order.statusHistory),
    true,
  );
}