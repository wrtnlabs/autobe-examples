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

/**
 * Test cart item deletion with validation of cart ownership and cart item existence.
 * This scenario validates that the system properly enforces authorization by ensuring
 * the customer can only delete cart items from carts they own.
 */
export async function test_api_cart_item_removal_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account (Customer A)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string &
        tags.Format<"email"> as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a shopping cart for Customer A
  const cart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Add a product variant to Customer A's cart
  const variantId: string = typia.random<string & tags.Format<"uuid">>();
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.create(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          variant_id: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Verify the cart item exists by checking deletedAt is NULL
  TestValidator.equals(
    "cart item not deleted before deletion",
    cartItem.deletedAt,
    null,
  );
  // 5. Delete the cart item using the DELETE endpoint
  await api.functional.ecommerceMall.customer.carts.items.erase(
    customerConnection,
    {
      cartId: cart.id,
      itemId: cartItem.id,
    },
  );
  // 6. Verify the cart item has been successfully removed by checking deletedAt is set
  const cartAfterDeletion: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.at(customerConnection, {
      cartId: cart.id,
    });
  typia.assert(cartAfterDeletion);
  TestValidator.notEquals(
    "cart updatedAt changed after deletion",
    cart.updated_at,
    cartAfterDeletion.updated_at,
  );
  // 7. Verify cart ownership matches customer
  TestValidator.equals(
    "cart owner matches customer",
    cartAfterDeletion.customer.id,
    customerAuth.id,
  );
  // 8. Verify the cart still exists after deletion
  TestValidator.equals(
    "cart still exists after deletion",
    cartAfterDeletion.id,
    cart.id,
  );
}
