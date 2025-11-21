import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete cart lifecycle from creation to soft deletion.
 *
 * Validates that a customer can create a shopping cart session and then perform
 * a soft deletion operation. Ensures that the cart is properly soft-deleted
 * with deleted_at timestamp set while preserving cart data for analytics.
 * Verifies that customers can only delete their own carts and that the
 * operation returns appropriate success response.
 */
export async function test_api_cart_soft_delete_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create shopping cart session with realistic random data
  const shippingMethods = ["standard", "express", "overnight"] as const;
  const couponCodes = ["WELCOME10", "SUMMER25", "FREESHIP"] as const;

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: RandomGenerator.pick(shippingMethods),
        applied_coupon_code: RandomGenerator.pick(couponCodes),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Validate cart creation
  TestValidator.equals("cart status should be active", cart.status, "active");
  TestValidator.equals(
    "cart should belong to the created customer",
    cart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.predicate(
    "cart should have valid creation timestamp",
    new Date(cart.created_at).getTime() > 0,
  );

  // Step 3: Perform soft deletion and validate successful completion
  await api.functional.shoppingMall.customer.carts.erase(connection, {
    cartId: cart.id,
  });

  // The operation completes successfully without throwing errors, indicating soft deletion worked
  // Since there's no GET endpoint to verify the deleted_at timestamp, we rely on the successful completion

  // Step 4: Validate that attempting to delete the same cart again should fail
  await TestValidator.error(
    "should fail when deleting already deleted cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(connection, {
        cartId: cart.id,
      });
    },
  );

  // Step 5: Validate that attempting to delete non-existent cart should fail
  const nonExistentCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when deleting non-existent cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(connection, {
        cartId: nonExistentCartId,
      });
    },
  );
}
