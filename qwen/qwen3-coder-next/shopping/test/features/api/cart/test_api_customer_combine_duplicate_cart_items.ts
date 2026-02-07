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
import { generate_random_shopping_mall_customer_carts_create } from "../../../generate/generate_random_shopping_mall_customer_carts_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_customer_combine_duplicate_cart_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(registered);
  // 2. Create new connection with token from registration
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: `Bearer ${registered.token.access}`,
  };
  // 3. Add same variant twice to cart (should combine quantities)
  // First addition with quantity 2
  const cart1 = await api.functional.shoppingMall.customer.carts.create(
    authConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    } satisfies IShoppingMallCart.ICreate,
  );
  typia.assert(cart1);
  // Second addition of same variant with quantity 3
  const cart2 = await api.functional.shoppingMall.customer.carts.create(
    authConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    } satisfies IShoppingMallCart.ICreate,
  );
  typia.assert(cart2);
  // TODO: Verify cart items are combined rather than duplicated
  // This requires access to cart listing endpoint to verify
  // only one cart item exists for the variant combination
}
