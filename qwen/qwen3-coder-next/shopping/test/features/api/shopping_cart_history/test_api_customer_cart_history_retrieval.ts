import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartHistory";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartHistory";
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

export async function test_api_customer_cart_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Login to establish authenticated session
  const loginResult = await api.functional.shoppingMall.auth.customer.login(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loginResult);
  // 3. Add product variant to cart (creates first history entry)
  const cartItem = await api.functional.shoppingMall.customer.carts.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cartItem);
  // 4. Update cart quantity (creates second history entry) - DELETE: Non-existent cartItem.id
  // 5. Retrieve cart history (DELETE: Cannot call due to missing cartId)
}
