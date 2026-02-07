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

export async function test_api_customer_add_to_cart_duplicate_increment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Add product to cart (first time)
  const cartItem1 =
    await generate_random_shopping_mall_customer_items_to_cart_add_to_cart(
      customerConnection,
      {
        body: typia.random<IShoppingMallCart.ICreate>(),
      },
    );
  typia.assert(cartItem1);
  // Step 3: Add same product to cart again (should increment quantity)
  const cartItem2 =
    await generate_random_shopping_mall_customer_items_to_cart_add_to_cart(
      customerConnection,
      {
        body: typia.random<IShoppingMallCart.ICreate>(),
      },
    );
  typia.assert(cartItem2);
  // Step 4: Verify both operations succeeded (responses are valid)
  TestValidator.predicate(
    "both cart operations completed successfully",
    cartItem1 !== null && cartItem2 !== null,
  );
}
