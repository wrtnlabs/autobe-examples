import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test unauthorized deletion of an order by a non-administrator customer.
 *
 * This test will:
 * 1. Create a customer account and authenticate.
 * 2. Attempt to delete an order using the customer's connection.
 * 3. Expect an HTTP 403 Forbidden error indicating access control is enforced.
 */
export async function test_api_customer_order_deletion_unauthorized_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Generate a random UUID for orderId (as test input)
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  // 2. Try to delete order as unauthorized customer
  await TestValidator.httpError(
    "unauthorized customer cannot delete order",
    403,
    async () => {
      await api.functional.shoppingMall.customer.orders.erase(
        customerConnection,
        {
          orderId: fakeOrderId,
        },
      );
    },
  );
}
