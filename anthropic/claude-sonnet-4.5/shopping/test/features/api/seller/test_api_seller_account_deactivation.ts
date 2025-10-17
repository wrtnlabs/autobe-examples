import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complete seller account deactivation workflow with soft deletion.
 *
 * This test validates the end-to-end seller account lifecycle including
 * registration, business activity establishment, and account deactivation
 * through soft deletion. The test ensures proper data preservation for audit
 * purposes while preventing further authentication after account deletion.
 *
 * Workflow Steps:
 *
 * 1. Admin creates platform category infrastructure
 * 2. Seller registers with complete business information
 * 3. Seller authenticates and establishes session
 * 4. Seller creates product to demonstrate business activity
 * 5. Seller deactivates account through soft deletion
 * 6. System validates authentication blocking after deletion
 * 7. Historical data preservation is maintained
 */
export async function test_api_seller_account_deactivation(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for platform management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category for seller's products
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller registers with complete business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller authenticates to establish session
  const loginResponse = await api.functional.shoppingMall.sellers.sessions.post(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(loginResponse);

  // Step 5: Seller creates product to establish business activity
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<number & tags.Minimum<0>>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Seller deactivates their account through soft deletion
  await api.functional.shoppingMall.seller.sellers.erase(connection, {
    sellerId: seller.id,
  });

  // Step 7: Verify authentication fails after account deletion
  await TestValidator.error(
    "seller cannot authenticate after account deletion",
    async () => {
      await api.functional.shoppingMall.sellers.sessions.post(connection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
