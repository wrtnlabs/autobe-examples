import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test updating an existing shopping cart item by its itemId within the
 * specified shopping cart by an authenticated customer. It confirms that
 * quantity updates are processed correctly and the response returns the updated
 * item. Access control is validated to allow only the cart owner. Error
 * scenarios such as invalid quantities or unauthorized requests are tested. The
 * test follows the full realistic flow including authentication.
 */
export async function test_api_shopping_cart_item_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "P@ssw0rd123";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Prepare a shopping cart item to update
  // For testing, fake UUIDs for cartId and itemId are generated
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();

  // 3. Update quantity with valid values
  const validQuantity = RandomGenerator.pick([1, 2, 3, 5, 10]);
  const updatedItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.updateCartItem(
      connection,
      {
        cartId: cartId,
        itemId: itemId,
        body: {
          quantity: validQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);

  // 4. Validate updated item fields
  TestValidator.equals(
    "updated quantity matches",
    updatedItem.quantity,
    validQuantity,
  );
  TestValidator.predicate(
    "updated item id matches input itemId",
    updatedItem.id === itemId,
  );
  TestValidator.predicate(
    "updated item cartId matches input cartId",
    updatedItem.shopping_mall_shopping_cart_id === cartId,
  );

  // 5. Validate date-time strings are ISO 8601 compliant using typia
  typia.assert<string & tags.Format<"date-time">>(updatedItem.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedItem.updated_at);

  // 6. Test error scenario: Update with invalid quantity (zero or negative)
  await TestValidator.error("update fails with quantity zero", async () => {
    await api.functional.shoppingMall.customer.shoppingCarts.items.updateCartItem(
      connection,
      {
        cartId: cartId,
        itemId: itemId,
        body: {
          quantity: 0, // invalid quantity
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  });

  await TestValidator.error("update fails with negative quantity", async () => {
    await api.functional.shoppingMall.customer.shoppingCarts.items.updateCartItem(
      connection,
      {
        cartId: cartId,
        itemId: itemId,
        body: {
          quantity: -5, // invalid quantity
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  });

  // 7. Test error scenario: Unauthorized update attempt
  // Simulate unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized update fails", async () => {
    await api.functional.shoppingMall.customer.shoppingCarts.items.updateCartItem(
      unauthenticatedConnection,
      {
        cartId: cartId,
        itemId: itemId,
        body: {
          quantity: validQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  });
}
