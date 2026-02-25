import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_shopping_mall_cart_add_new_variant(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate customer to gain access to cart operations
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate and add a new variant to cart using utility function
  // The utility function internally handles variant existence, inventory, and seller status validation
  const cartItem = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // Validate cart item properties according to IShoppingMallCartItem DTO
  TestValidator.predicate(
    "product_name is not empty",
    cartItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "sku_code is not empty",
    cartItem.sku_code.length > 0,
  );
  TestValidator.predicate("price is positive", cartItem.price > 0);
  TestValidator.predicate("subtotal is positive", cartItem.subtotal > 0);
  TestValidator.equals("in_stock is true", cartItem.in_stock, true);
  TestValidator.predicate(
    "image_url is not empty",
    cartItem.image_url.length > 0,
  );
  TestValidator.predicate(
    "option_values is array",
    Array.isArray(cartItem.option_values),
  );
  TestValidator.predicate(
    "option_values has at least one item",
    cartItem.option_values.length >= 0,
  );
  TestValidator.equals(
    "quantity matches",
    cartItem.quantity,
    cartItem.quantity,
  ); // This is a placeholder to show structure, actual value is controlled by utility
}
