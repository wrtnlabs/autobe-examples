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

export async function test_api_shopping_mall_customer_cart_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register new customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Generate a random cart ID since we cannot create carts
  // In a real scenario, this would come from database setup
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Update cart quantity
  const newQuantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const updatedCart =
    await api.functional.shoppingMall.customer.carts.putByCartid(
      customerConnection,
      {
        cartId: cartId,
        body: {
          quantity: newQuantity,
        } satisfies IShoppingMallCart.IUpdate,
      },
    );
  typia.assert(updatedCart);
}
