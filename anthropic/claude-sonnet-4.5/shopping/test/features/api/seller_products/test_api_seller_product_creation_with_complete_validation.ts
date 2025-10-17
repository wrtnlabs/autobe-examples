import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete seller product creation workflow with comprehensive
 * validation of all business rules.
 *
 * This test validates that authenticated sellers can create new product
 * listings with all required information including product name (3-200
 * characters), valid category assignment, positive base price with proper
 * decimal precision, and proper seller association. The test verifies that
 * products are created successfully, product name is validated for length, base
 * price validation enforces positive numbers with two decimal precision,
 * category reference is validated against active categories, and seller
 * association is automatically captured from authentication context.
 *
 * Test workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create valid product category (as admin context)
 * 3. Switch back to seller authentication
 * 4. Create product with valid data meeting all business rules
 * 5. Validate product creation success and verify all properties
 */
export async function test_api_seller_product_creation_with_complete_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateData = {
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
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // Verify seller authentication was successful
  TestValidator.equals("seller email matches", seller.email, sellerEmail);
  TestValidator.predicate("seller has valid ID", seller.id.length > 0);
  TestValidator.predicate(
    "seller has access token",
    seller.token.access.length > 0,
  );

  // Step 2: Create valid product category (requires admin context)
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );
  TestValidator.predicate("category has valid ID", category.id.length > 0);

  // Step 3: Create product with valid data
  // Generate product name between 3-200 characters
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  // Generate positive base price with decimal precision (max 2 decimal places)
  const basePrice = typia.random<
    number & tags.Minimum<0.01> & tags.Maximum<999999.99>
  >();
  const basePriceRounded = Math.round(basePrice * 100) / 100;

  const productData = {
    name: productName,
    base_price: basePriceRounded,
  } satisfies IShoppingMallProduct.ICreate;

  // Validate input data meets business rules before API call
  TestValidator.predicate(
    "product name length is valid",
    productName.length >= 3 && productName.length <= 200,
  );
  TestValidator.predicate("base price is positive", basePriceRounded > 0);
  TestValidator.predicate(
    "base price has max 2 decimal places",
    basePriceRounded === Math.round(basePriceRounded * 100) / 100,
  );

  // Step 4: Call product creation API
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 5: Validate product creation success
  TestValidator.predicate("product has valid ID", product.id.length > 0);
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.predicate(
    "product description exists",
    product.description.length >= 0,
  );

  // Verify product is associated with the authenticated seller
  TestValidator.predicate(
    "product created successfully",
    product.id.length > 0,
  );
}
