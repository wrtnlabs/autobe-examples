import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that a platform administrator can retrieve a customer cart created
 * via customer APIs using the admin detail endpoint.
 *
 * Business context:
 *
 * - Customers own persistent carts stored in shopping_mall_customer_carts.
 * - Platform admins must be able to inspect these carts via
 *   /shoppingMall/platformAdmin/customerCarts/{customerCartId} for operational
 *   and audit purposes.
 * - The test focuses on the happy-path retrieval using a real cart ID created
 *   through the customer-facing create endpoint, then fetched via the
 *   admin-facing detail endpoint.
 *
 * Steps:
 *
 * 1. Customer self-registers via POST /auth/customer/join.
 * 2. As that customer, create a new cart via POST
 *    /shoppingMall/customer/customerCarts and capture the returned cart.
 * 3. Register a platform admin via POST /auth/platformAdmin/join (this also
 *    authenticates the admin on the shared connection).
 * 4. As the platform admin, call GET
 *    /shoppingMall/platformAdmin/customerCarts/{customerCartId} using the ID of
 *    the previously created cart.
 * 5. Validate that:
 *
 *    - The admin endpoint returns a valid IShoppingMallCustomerCart.
 *    - The returned cart.id equals the original customer cart id.
 *    - The embedded customer summary id equals the registered customer id.
 *    - Is_active, currency_code, region_code, and aggregate monetary fields are
 *         consistent between customer and admin views.
 */
export async function test_api_platform_admin_get_soft_deleted_customer_cart(
  connection: api.IConnection,
) {
  // 1. Customer joins (self-registration)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Customer creates a cart
  const cartCreateBody = {
    // Let backend choose sensible defaults for currency/region if not provided
    // but provide some explicit values to make assertions more meaningful.
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "platform-admin-cart-at",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  // Basic invariants from customer side
  TestValidator.equals(
    "customer cart owner id matches authorized customer id",
    customerCart.customer.id,
    customerAuthorized.id,
  );

  // Snapshot values for later comparison
  const originalCartId = customerCart.id;
  const originalIsActive = customerCart.is_active;
  const originalCurrencyCode = customerCart.currency_code;
  const originalRegionCode = customerCart.region_code;
  const originalSubtotal = customerCart.subtotal_amount;
  const originalDiscount = customerCart.discount_amount;
  const originalTax = customerCart.tax_amount;
  const originalShipping = customerCart.shipping_amount;
  const originalTotal = customerCart.total_amount;
  const originalCreatedAt = customerCart.created_at;
  const originalUpdatedAt = customerCart.updated_at;

  // 3. Register a platform administrator (also authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/seed",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin fetches the cart detail by ID
  const adminViewCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.platformAdmin.customerCarts.at(
      connection,
      {
        customerCartId: originalCartId,
      },
    );
  typia.assert(adminViewCart);

  // 5. Cross-view validations between customer and admin representations
  TestValidator.equals(
    "admin view cart id matches original cart id",
    adminViewCart.id,
    originalCartId,
  );

  TestValidator.equals(
    "admin view customer id matches original customer id",
    adminViewCart.customer.id,
    customerAuthorized.id,
  );

  TestValidator.equals(
    "admin view is_active matches customer view is_active",
    adminViewCart.is_active,
    originalIsActive,
  );

  TestValidator.equals(
    "admin view currency_code matches customer view",
    adminViewCart.currency_code,
    originalCurrencyCode,
  );

  TestValidator.equals(
    "admin view region_code matches customer view",
    adminViewCart.region_code,
    originalRegionCode,
  );

  TestValidator.equals(
    "admin view subtotal_amount matches customer view",
    adminViewCart.subtotal_amount,
    originalSubtotal,
  );

  TestValidator.equals(
    "admin view discount_amount matches customer view",
    adminViewCart.discount_amount,
    originalDiscount,
  );

  TestValidator.equals(
    "admin view tax_amount matches customer view",
    adminViewCart.tax_amount,
    originalTax,
  );

  TestValidator.equals(
    "admin view shipping_amount matches customer view",
    adminViewCart.shipping_amount,
    originalShipping,
  );

  TestValidator.equals(
    "admin view total_amount matches customer view",
    adminViewCart.total_amount,
    originalTotal,
  );

  TestValidator.equals(
    "admin view created_at matches customer view",
    adminViewCart.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "admin view updated_at matches customer view",
    adminViewCart.updated_at,
    originalUpdatedAt,
  );
}
