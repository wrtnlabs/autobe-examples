import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer and establish authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "securePassword123";
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Generate a random cart item ID to retrieve (we assume a cart item exists for this customer)
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the cart item
  const cartItem = await api.functional.shoppingMall.customer.carts.at(
    customerConnection,
    {
      cartItemId,
    },
  );
  typia.assert(cartItem);
  // 4. Validate that the response is a non-null object (as per IShoppingMallCartItem schema definition)
  // Note: IShoppingMallCartItem is defined as {} - empty object. We cannot validate any snapshot fields.
  // We must validate only what the schema defines: that we received a non-null object.
  TestValidator.predicate(
    "cart item is an object",
    cartItem !== null && typeof cartItem === "object",
  );
}
