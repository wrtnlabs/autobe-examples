import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate cart creation security by testing session validation mechanisms.
 *
 * This test verifies that the system properly rejects cart creation attempts
 * when customer sessions are invalid, expired, or belong to different users. It
 * ensures security measures prevent unauthorized cart creation and validate
 * session integrity before cart initialization.
 *
 * Test scenarios include:
 *
 * 1. Valid cart creation with authenticated customer session
 * 2. Invalid session ID rejection (non-existent UUID)
 * 3. Malformed session ID rejection (invalid UUID format)
 * 4. Proper error handling for security violations
 */
export async function test_api_customer_cart_creation_session_validation(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "securePassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      ip: "192.168.1.100",
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com/home",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Test valid cart creation with customer's session
  const validCart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: "standard",
        applied_coupon_code: "WELCOME10",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(validCart);
  TestValidator.equals(
    "cart should be linked to customer",
    validCart.shopping_mall_customer_session_id,
    customer.id,
  );

  // Step 3: Test invalid session ID (non-existent UUID)
  await TestValidator.error(
    "should reject non-existent session ID",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: {
          shopping_mall_customer_session_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallCart.ICreate,
      });
    },
  );

  // Step 4: Test malformed session ID (invalid UUID format)
  await TestValidator.error("should reject malformed session ID", async () => {
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_session_id: "invalid-uuid-format",
      } satisfies IShoppingMallCart.ICreate,
    });
  });

  // Step 5: Test empty session ID
  await TestValidator.error("should reject empty session ID", async () => {
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_session_id: "",
      } satisfies IShoppingMallCart.ICreate,
    });
  });

  // Step 6: Verify cart properties are correctly set
  TestValidator.equals(
    "cart status should be active",
    validCart.status,
    "active",
  );
  TestValidator.predicate(
    "cart should have creation timestamp",
    validCart.created_at !== null && validCart.created_at !== undefined,
  );
  TestValidator.predicate(
    "cart should have expiration timestamp",
    validCart.expires_at !== null && validCart.expires_at !== undefined,
  );
}
