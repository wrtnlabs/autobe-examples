import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: "http://test.example.com/join",
      referrer: "http://test.example.com",
    },
  });
  typia.assert(customerAuthorized);
  // 2. Create dedicated connection for authenticated customer operations
  const customerCartConnection: api.IConnection = { host: connection.host };
  customerCartConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 3. Create shopping cart for customer
  const cart = await api.functional.ecommerceMall.customer.carts.create(
    customerCartConnection,
  );
  typia.assert(cart);
  // 4. Add a product variant to the cart using utility function
  const cartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      customerCartConnection,
      {
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItem);
  // 5. Delete the cart item using the erase endpoint
  // Expected: 204 No Content, void return value
  await api.functional.ecommerceMall.customer.carts.items.erase(
    customerCartConnection,
    {
      cartId: cart.id,
      itemId: cartItem.id,
    },
  );
  // 6. Verify deletion by adding a different item
  // Generate a new variant to ensure we're creating a different cart item
  const cartItemAfterDeletion =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      customerCartConnection,
      {
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItemAfterDeletion);
  // Verify a new cart item was created
  TestValidator.notEquals(
    "new cart item created after deletion",
    cartItemAfterDeletion.id,
    cartItem.id,
  );
  // Verify the cart remains valid after deletion
  TestValidator.equals(
    "cart remains valid after deletion",
    cart.id,
    cartItemAfterDeletion.cart.id,
  );
}
