import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * E2E test for customer order authorization enforcement.
 *
 * This test creates two distinct customer accounts, each joining and obtaining
 * authorization tokens. It then attempts to retrieve an order belonging to the
 * second customer using the first customer's authorization token, expecting
 * an authorization error (403 Forbidden). This ensures that order details are
 * not accessible to unauthorized customers.
 */
export async function test_api_customer_order_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create first customer and obtain authorized connection
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customer1Connection.headers = {
    Authorization: `Bearer ${customer1Auth.token.access}`,
  };
  // Create second customer and obtain authorized connection
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customer2Connection.headers = {
    Authorization: `Bearer ${customer2Auth.token.access}`,
  };
  // We simulate an order ID that belongs to second customer
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve second customer's order with first customer's connection
  await TestValidator.httpError("Authorization forbidden", 403, async () => {
    await api.functional.shoppingMall.customer.orders.at(customer1Connection, {
      orderId: orderId,
    });
  });
}
