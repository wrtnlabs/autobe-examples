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

export async function test_api_customer_order_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Edge case: Customer attempts to retrieve an order with a non-existent orderId UUID.
  // Verify the API returns a 404 not found response to indicate absence of the order.
  // Step 1: Customer join to authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  // Since IShoppingMallCustomer.IJoin is empty object literally, just pass empty object
  await authorize_customer_join(customerConnection, { body: {} });
  // Step 2: Attempt to retrieve order with a random UUID that doesn't exist
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Expect 404 error on retrieving non-existent order
  await TestValidator.httpError(
    "retrieving non-existent customer order returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.orders.at(customerConnection, {
        orderId: fakeOrderId,
      });
    },
  );
}
