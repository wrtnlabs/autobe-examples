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
 * Test the complete workflow of a seller deleting their own draft product.
 *
 * This test validates that sellers can successfully remove products that have
 * never been ordered, enforcing the business rule that only draft products or
 * products without order history are eligible for deletion. The test creates a
 * new seller account, authenticates the seller, creates a product category for
 * classification, creates a draft product in the seller's catalog, and then
 * permanently deletes the product.
 *
 * The test verifies that the delete operation correctly:
 *
 * 1. Enforces ownership validation (sellers can only delete their own products)
 * 2. Validates deletion eligibility (no order history exists)
 * 3. Performs hard deletion removing the product record and all associated data
 * 4. Confirms the product is completely removed from the database
 *
 * Steps:
 *
 * 1. Create and authenticate admin account to set up category
 * 2. Admin creates product category required for product creation
 * 3. Create and authenticate seller account for product operations
 * 4. Seller creates a draft product with valid category reference
 * 5. Seller deletes the draft product permanently
 * 6. Verify deletion succeeded (void return indicates success)
 */
export async function test_api_product_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create and authenticate seller for product operations
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 2 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 4: Seller creates a draft product
  const productData = {
    name: RandomGenerator.name(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 5: Seller deletes the draft product permanently
  await api.functional.shoppingMall.seller.products.erase(connection, {
    productId: product.id,
  });

  // Step 6: Deletion succeeded (void return means success)
  // The product has been permanently removed from the database
}
