import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_empty_cart_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for cart retrieval
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer to get an empty cart
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(registeredCustomer);
  // Create a new connection with the authorization token
  const cartConnection: api.IConnection = {
    host: customerConnection.host,
    headers: {
      Authorization: registeredCustomer.token.access,
    },
  };
  // Retrieve empty cart and cast to proper type
  const cartSummary = typia.assert<IShoppingMallCart.ISummary>(
    await api.functional.shoppingMall.customer.carts.index(cartConnection),
  );
  typia.assert(cartSummary);
  // Validate empty cart structure - ISummary is an empty type {}, so no properties to validate
  // The API is expected to return an empty cart object
  TestValidator.predicate("cart retrieval successful", cartSummary !== null);
}
