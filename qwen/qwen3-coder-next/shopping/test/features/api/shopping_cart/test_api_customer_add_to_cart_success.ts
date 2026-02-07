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
import { generate_random_shopping_mall_customer_items_to_cart_add_to_cart } from "../../../generate/generate_random_shopping_mall_customer_items_to_cart_add_to_cart";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

/**
 * Test successful customer add to cart workflow.
 * 1. Customer registers and logs in
 * 2. Customer adds a product variant to cart
 * 3. Validate cart item creation
 */
export async function test_api_customer_add_to_cart_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<DeepPartial<IShoppingMallCustomer.IJoin>>(),
  });
  // 2. Add product variant to cart using customer connection
  const cartItem: IShoppingMallCart =
    await api.functional.shoppingMall.customer.items_to_cart.addToCart(
      customerConnection,
      {
        body: typia.random<IShoppingMallCart.ICreate>(),
      },
    );
  typia.assert(cartItem);
  // 3. Validate cart item has required properties
  TestValidator.predicate("cart item exists", cartItem !== null);
}
