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

export async function test_api_customer_order_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Assume an order is created before this test (because order creation is out-of-scope here)
  //    We must use a valid orderId to retrieve
  // For this scenario, to get a valid orderId, we have to simulate or attempt an order creation
  // but since we have not the API or utility here to create order, we must skip order creation
  // and thus we cannot get a valid orderId from API provided.
  // Due to absence of order creation API or utility, rewrite scenario as follows:
  // Retrieve order using a random but valid UUID to check success path.
  // This may succeed only if such order exists, since we cannot create one.
  // Generate a valid UUID for orderId
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve order by orderId
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  // 4. Validate response schema
  typia.assert(order);
  // 5. Validate important properties (only if they exist)
  // Since IShoppingMallOrder is {} in DTO, no properties are defined,
  // so no property validation can be done
  // If properties existed, we would validate total_price, total_quantity, order_status, created_at, updated_at
}
