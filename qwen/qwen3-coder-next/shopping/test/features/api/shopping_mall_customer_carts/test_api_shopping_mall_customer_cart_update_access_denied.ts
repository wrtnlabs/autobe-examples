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

export async function test_api_shopping_mall_customer_cart_update_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer account and cart item
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const cartItem1 = await api.functional.shoppingMall.customer.carts.create(
    customer1Connection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    },
  );
  typia.assert(cartItem1);
  // 2. Create second customer account
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Second customer attempts unauthorized cart update - should fail
  await TestValidator.error(
    "access denied - different customer's cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.putByCartid(
        customer2Connection,
        {
          cartId: "test-cart-id",
          body: typia.random<IShoppingMallCart.IUpdate>(),
        },
      );
    },
  );
}
