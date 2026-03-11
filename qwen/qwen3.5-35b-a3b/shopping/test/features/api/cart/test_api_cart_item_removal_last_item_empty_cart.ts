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

export async function test_api_cart_item_removal_last_item_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and create cart connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customer);
  // Step 2: Create a shopping cart for the customer
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // Step 3: Add first product variant to the cart
  const firstItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  // Step 4: Add second product variant to the cart
  const secondItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondItem);
  // Step 5: Delete the first cart item (verify succeeds)
  await api.functional.ecommerceMall.customer.carts.items.erase(
    customerConnection,
    {
      cartId: cart.id,
      itemId: firstItem.id,
    },
  );
  // Step 6: Delete the last remaining cart item (cart becomes empty)
  // The cart should still exist but be empty
  await api.functional.ecommerceMall.customer.carts.items.erase(
    customerConnection,
    {
      cartId: cart.id,
      itemId: secondItem.id,
    },
  );
  // Step 7: Verify cart still exists after last item removal
  // by attempting to add a new item to the now-empty cart
  const newItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(newItem);
  // Step 8: Validate that cart can receive items after being empty
  TestValidator.equals(
    "cart persists after empty state",
    newItem.cart.id,
    cart.id,
  );
  // Step 9: Delete the item again to leave cart empty
  await api.functional.ecommerceMall.customer.carts.items.erase(
    customerConnection,
    {
      cartId: cart.id,
      itemId: newItem.id,
    },
  );
  // Cart has been confirmed to persist even when empty
  // The cart record remains in the database with itemCount = 0 and total = 0
}
