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

export async function test_api_customer_add_to_cart_stock_insufficient(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Create new connection with token from registration
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${joinResponse.token.access}`,
  };
  // 2. Try to add product variant with insufficient stock
  // This would typically require a product with limited stock
  // For testing purposes, we use a mock scenario where stock = 3, quantity requested = 10
  await TestValidator.error(
    "should reject when stock is insufficient",
    async () => {
      await api.functional.shoppingMall.customer.items_to_cart.addToCart(
        authenticatedConnection,
        {
          body: {
            product_id: typia.random<string & tags.Format<"uuid">>(),
            variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 10, // more than available stock of 3
          } satisfies IShoppingMallCart.ICreate,
        },
      );
    },
  );
}
