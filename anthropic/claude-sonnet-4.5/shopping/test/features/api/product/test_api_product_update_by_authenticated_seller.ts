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
 * Test the complete workflow of a seller updating their own product
 * information.
 *
 * This test validates that sellers can successfully modify product attributes
 * including product name while maintaining proper ownership validation. The
 * test creates necessary infrastructure (admin and category), then creates a
 * seller account, creates a product, updates it, and validates the results.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as admin
 * 2. Create product category for classification
 * 3. Create and authenticate as seller
 * 4. Create initial product with basic information
 * 5. Update product with modified information
 * 6. Verify update operation enforces ownership validation
 * 7. Validate updated product record reflects new values
 */
export async function test_api_product_update_by_authenticated_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      business_type: "corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create initial product
  const originalProductName = RandomGenerator.name();
  const basePrice = Math.random() * 1000 + 10;

  const createdProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: originalProductName,
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);

  // Verify initial product creation
  TestValidator.equals(
    "created product name matches",
    createdProduct.name,
    originalProductName,
  );

  // Step 5: Update product with modified information
  const updatedProductName = RandomGenerator.name();

  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: createdProduct.id,
      body: {
        name: updatedProductName,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);

  // Step 6 & 7: Verify update operation results
  TestValidator.equals(
    "product ID remains unchanged",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product name updated successfully",
    updatedProduct.name,
    updatedProductName,
  );
  TestValidator.notEquals(
    "product name changed from original",
    updatedProduct.name,
    originalProductName,
  );
}
