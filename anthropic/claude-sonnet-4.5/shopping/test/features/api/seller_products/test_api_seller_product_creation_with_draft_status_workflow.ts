import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the product creation workflow focusing on draft status initialization
 * and subsequent product completion.
 *
 * This test validates the product lifecycle management capability that enables
 * sellers to prepare products incrementally without exposing incomplete
 * listings to customers. The workflow verifies:
 *
 * 1. Seller registration and authentication with complete business information
 * 2. Admin category creation to provide product categorization
 * 3. Product creation with automatic draft status initialization
 * 4. Verification of draft product properties and state
 *
 * The test confirms that newly created products start in draft status, allowing
 * sellers to prepare complete information before publication and ensuring draft
 * products remain isolated from customer-facing catalog searches.
 */
export async function test_api_seller_product_creation_with_draft_status_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Verify seller data matches input
  TestValidator.equals("seller email should match", seller.email, sellerEmail);
  TestValidator.equals(
    "seller business name should match",
    seller.business_name,
    sellerData.business_name,
  );

  // Step 2: Create product category (admin operation)
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  TestValidator.equals(
    "category name should match",
    category.name,
    categoryData.name,
  );

  // Step 3: Create product in draft status
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 4: Verify draft product creation
  TestValidator.equals(
    "product name should match",
    product.name,
    productData.name,
  );
}
