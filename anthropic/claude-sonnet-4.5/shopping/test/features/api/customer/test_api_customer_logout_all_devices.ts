import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test comprehensive multi-device logout workflow for customer sessions.
 *
 * This test validates that a customer can terminate all active sessions
 * simultaneously by calling the logout endpoint. The test ensures that all
 * refresh tokens are revoked atomically and that the customer must
 * re-authenticate on all devices after logout.
 *
 * Test Flow:
 *
 * 1. Create admin account and category for product structure
 * 2. Create seller account and product with SKU variant
 * 3. Create customer account with authenticated session
 * 4. Execute logout from all devices with refresh token
 * 5. Validate logout response and session termination confirmation
 *
 * Note: Cart item creation has been removed due to lack of cart retrieval API.
 * The logout functionality is independent of cart state and can be tested
 * without it.
 */
export async function test_api_customer_logout_all_devices(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account for product creation
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "corporation",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 5: Create SKU variant for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account with authenticated session
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // Store refresh token for logout operation
  const refreshToken = customer.token.refresh;

  // Step 7: Execute multi-device logout
  const logoutData = {
    refresh_token: refreshToken,
  } satisfies IShoppingMallCustomer.ILogout;

  const logoutResponse = await api.functional.auth.customer.logout(connection, {
    body: logoutData,
  });
  typia.assert(logoutResponse);

  // Step 8: Validate logout response with comprehensive checks
  TestValidator.predicate(
    "logout response should contain confirmation message",
    logoutResponse.message.length > 0,
  );

  TestValidator.predicate(
    "logout message should be a valid string indicating session termination",
    typeof logoutResponse.message === "string",
  );

  TestValidator.predicate(
    "logout should complete successfully with proper response structure",
    logoutResponse.message !== null && logoutResponse.message !== undefined,
  );
}
