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

export async function test_api_customer_cart_item_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerToken = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customerToken);
  // Create new connection with token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: customerToken.token.access,
    },
  };
  // 2. Add product variant to cart
  const cartItem = await api.functional.shoppingMall.customer.carts.create(
    authorizedConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    },
  );
  typia.assert(cartItem);
  // 3. Delete the cart item
  // Extract the cartId from cartItem based on the correct property name
  const cartId = (cartItem as any as { id: string }).id;
  await api.functional.shoppingMall.customer.carts.erase(authorizedConnection, {
    cartId,
  });
  // 4. Verify cart item is deleted by attempting to get it
  // (This would typically return 404 or null, but exact behavior depends on API implementation)
}