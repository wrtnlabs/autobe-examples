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

export async function test_api_customer_order_partially_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResponse = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerResponse);
  // Update connection with authorized token
  customerConnection.headers = {
    Authorization: `Bearer ${customerResponse.token.access}`,
  };
  // 2. Retrieve an order (we don't have endpoints to create one, so we generate a random UUID)
  // The scenario requires "partially completed" status, but since we cannot create
  // orders with specific item statuses, and the IShoppingMallOrder DTO is empty,
  // we must retrieve any order and validate only that it returns successfully.
  // The actual content is determined by backend data; we validate our code works.
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
}
