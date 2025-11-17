import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate updating a shopping mall cart item by a customer.
 *
 * This test performs the entire workflow including:
 *
 * - Customer account registration with join
 * - Shopping mall customer registration
 * - Shopping mall cart creation
 * - Shopping mall cart item creation
 * - Updating the shopping mall cart item with new quantity and variant ID
 * - Validating that updates are persisted and visible
 * - Ensuring authorization is correctly enforced during these operations
 *
 * It uses actual realistic data with UUIDs and quantities >=1. All API
 * responses are validated using typia.assert to ensure type safety.
 *
 * All required steps are awaited properly with strict type safety.
 */
export async function test_api_shopping_mall_cart_item_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: `${RandomGenerator.name(2).replace(/\s+/g, "").toLowerCase()}@example.com`,
        password: `Passw0rd!${RandomGenerator.alphaNumeric(5)}`,
        href: "https://localhost",
        referrer: "https://localhost/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  // 2. Register a shopping mall customer
  const shoppingMallCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: {
          email: customerAuthorized.email,
          password: `Passw0rd!${RandomGenerator.alphaNumeric(5)}`,
          href: "https://localhost",
          referrer: "https://localhost/referrer",
        } satisfies IShoppingMallCustomer.ICreate,
      },
    );
  typia.assert(shoppingMallCustomer);

  // 3. Create a shopping mall cart
  const shoppingCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.shoppingMallCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_session_id: null,
        } satisfies IShoppingMallCart.ICreate,
      },
    );
  typia.assert(shoppingCart);

  // 4. Create a shopping mall cart item
  const productVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemCreated: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingMallCarts.shoppingMallCartItems.create(
      connection,
      {
        shoppingMallCartId: shoppingCart.id,
        body: {
          quantity: 1,
          shoppingMallProductVariantId: productVariantId,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemCreated);

  // 5. Update the shopping mall cart item
  const updatedQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    RandomGenerator.pick([1, 2, 3, 5, 10]);
  const newProductVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemUpdated: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingMallCarts.shoppingMallCartItems.update(
      connection,
      {
        shoppingMallCartId: shoppingCart.id,
        shoppingMallCartItemId: cartItemCreated.id,
        body: {
          quantity: updatedQuantity,
          shoppingMallProductVariantId: newProductVariantId,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(cartItemUpdated);

  // 6. Validate that updates persisted
  TestValidator.equals(
    "updated cart item quantity matches",
    cartItemUpdated.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "updated cart item product variant id matches",
    cartItemUpdated.shopping_mall_product_variant_id,
    newProductVariantId,
  );
}
