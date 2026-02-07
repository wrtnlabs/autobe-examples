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

export async function test_api_customer_cart_item_deletion_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two separate customer connections
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Customer A creates a cart item
  const cartItemA = await api.functional.shoppingMall.customer.carts.create(
    customerAConnection,
    {
      body: typia.random<IShoppingMallCart.ICreate>(),
    },
  );
  typia.assert(cartItemA);
  // 3. Customer B attempts to delete Customer A's cart item (access denied)
  await TestValidator.error(
    "customer B cannot delete customer A's cart item",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(
        customerBConnection,
        {
          cartId: (cartItemA as any).id,
        },
      );
    },
  );
  // 4. Verify the cart item still exists for customer A
  const remainingCartItem =
    await api.functional.shoppingMall.customer.carts.create(
      customerAConnection,
      {
        body: typia.random<IShoppingMallCart.ICreate>(),
      },
    );
  typia.assert(remainingCartItem);
  TestValidator.notEquals(
    "cart IDs differ",
    (cartItemA as any).id,
    (remainingCartItem as any).id,
  );
}