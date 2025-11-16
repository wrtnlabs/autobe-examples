import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Validate that a newly registered customer can immediately create their first
 * persistent shopping cart using default configuration and receive a fully
 * populated cart representation.
 *
 * Business goals:
 *
 * - Joining as a customer must yield an authenticated context that can create
 *   carts without additional login.
 * - Cart creation must derive ownership from the auth context, not from any
 *   client-provided identifier.
 * - A freshly created cart with no items should have zeroed monetary totals and
 *   be active by default in a sensible region/currency.
 *
 * Flow:
 *
 * 1. Register a brand-new customer via POST /auth/customer/join.
 * 2. Immediately call POST /shoppingMall/customer/customerCarts with a minimal
 *    IShoppingMallCustomerCart.ICreate payload (omit all optional fields) to
 *    rely on backend defaults for currency_code, region_code, channel, etc.
 * 3. Validate that the returned IShoppingMallCustomerCart is well-formed and
 *    belongs to the authenticated customer.
 * 4. Validate initial monetary totals and lifecycle fields.
 */
export async function test_api_customer_cart_creation_for_new_customer(
  connection: api.IConnection,
) {
  // 1. Register a brand-new customer and obtain authorized context
  const joinBody = {
    email: `customer_${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // Optional ip left undefined to allow backend to infer from transport
    href: "https://frontend.example.com/signup",
    referrer: "https://frontend.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a minimal persistent customer cart relying on backend defaults
  const createCartBody = {
    // Intentionally omit currency_code, region_code, channel, metadata,
    // is_active, and source_guest_token to exercise backend defaults.
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(cart);

  // 3. Ownership and identity validations
  TestValidator.equals(
    "cart customer id must match authorized customer id",
    cart.customer.id,
    authorized.id,
  );

  // 4. Lifecycle / status validations
  TestValidator.predicate(
    "newly created cart must be active",
    cart.is_active === true,
  );

  TestValidator.predicate(
    "cart status must be a non-empty string",
    typeof cart.status === "string" && cart.status.length > 0,
  );

  // 5. Currency and region configuration
  TestValidator.predicate(
    "currency_code must be a non-empty string (default or inferred)",
    typeof cart.currency_code === "string" && cart.currency_code.length > 0,
  );

  TestValidator.predicate(
    "region_code must be a non-empty string (default or inferred)",
    typeof cart.region_code === "string" && cart.region_code.length > 0,
  );

  // 6. Monetary totals for an empty cart
  TestValidator.equals(
    "subtotal_amount must be initialized to zero",
    cart.subtotal_amount,
    0,
  );
  TestValidator.equals(
    "discount_amount must be initialized to zero",
    cart.discount_amount,
    0,
  );
  TestValidator.equals(
    "tax_amount must be initialized to zero",
    cart.tax_amount,
    0,
  );
  TestValidator.equals(
    "shipping_amount must be initialized to zero",
    cart.shipping_amount,
    0,
  );
  TestValidator.equals(
    "total_amount must be initialized to zero",
    cart.total_amount,
    0,
  );

  // 7. Temporal fields
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    typeof cart.created_at === "string" && cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty date-time string",
    typeof cart.updated_at === "string" && cart.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at must be null or undefined for a newly created active cart",
    cart.deleted_at === null || cart.deleted_at === undefined,
  );
}
