import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - Create account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Retrieve or create customer cart
  const cart = await api.functional.ecommerceMall.customer.carts.at(
    customerConnection,
    {
      cartId: customerAuth.id,
    },
  );
  typia.assert(cart);
  // Add a second variant to test preservation of other items
  const variant1Id = typia.random<string & tags.Format<"uuid">>();
  const variant2Id = typia.random<string & tags.Format<"uuid">>();
  // 3. Add first product variant to cart
  const cartItem1 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variant1Id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 4. Add second product variant to cart (for preservation test)
  const cartItem2 =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variant2Id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 5. Verify cart has two items
  const cartWithTwoItems = await api.functional.ecommerceMall.customer.carts.at(
    customerConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(cartWithTwoItems);
  TestValidator.equals(
    "cart contains two items",
    cartWithTwoItems.cart_items.length,
    2,
  );
  // 6. Capture original update timestamp
  const originalUpdatedAt = cartWithTwoItems.updated_at;
  // 7. Delete the first cart item
  await api.functional.ecommerceMall.customer.carts.cartItems.erase(
    customerConnection,
    {
      cartId: cart.id,
      cartItemId: cartItem1.id,
    },
  );
  // 8. Verify cart item is removed and second item is preserved
  const cartAfterRemoval = await api.functional.ecommerceMall.customer.carts.at(
    customerConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(cartAfterRemoval);
  TestValidator.equals(
    "one cart item remains",
    cartAfterRemoval.cart_items.length,
    1,
  );
  TestValidator.equals(
    "remaining item is the second variant",
    cartAfterRemoval.cart_items[0].variant.id,
    variant2Id,
  );
  // 9. Verify cart updated_at timestamp changed
  TestValidator.predicate(
    "cart updated_at reflects deletion",
    () => new Date(cartAfterRemoval.updated_at) > new Date(originalUpdatedAt),
  );
  // 10. Verify cart session remains intact (same cart ID and customer)
  TestValidator.equals("cart ID preserved", cartAfterRemoval.id, cart.id);
  TestValidator.equals(
    "customer_id preserved",
    cartAfterRemoval.customer_id,
    cart.customer_id,
  );
  // 11. Verify same product variant can be re-added (reversible removal)
  const reAddedItem =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variant1Id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(reAddedItem);
  const finalCart = await api.functional.ecommerceMall.customer.carts.at(
    customerConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(finalCart);
  TestValidator.equals(
    "cart item re-added successfully",
    finalCart.cart_items.length,
    2,
  );
}
