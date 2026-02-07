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

/**
 * Test batch update functionality for shopping cart items.
 * 1. Register and authenticate customer
 * 2. Add items to cart (assumed to be done separately)
 * 3. Update quantities for multiple cart items via batch request
 * 4. Validate successful response structure
 */
export async function test_api_shopping_cart_update_batch_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Update quantities for multiple cart items
  const updateResult = await api.functional.shoppingMall.customer.carts.patch(
    customerConnection,
    {
      body: {
        items: ArrayUtil.repeat(3, (i) => ({
          cart_id: `cart-item-${i}` as any,
          quantity: typia.random<number & tags.Type<"uint32">>() + 1,
        })),
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(updateResult);
}
