import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that product details are publicly accessible without authentication for
 * guest browsing.
 *
 * This test validates the critical e-commerce requirement that potential
 * customers can view product details without requiring account creation or
 * login. This is essential for customer acquisition and conversion
 * optimization.
 *
 * Test Flow:
 *
 * 1. Create seller account (to own the product being tested)
 * 2. Create product category (for proper product classification)
 * 3. Create an active product under the seller account
 * 4. Create unauthenticated connection (simulate guest user)
 * 5. Retrieve product details using unauthenticated connection
 * 6. Validate that product data is complete and accessible
 */
export async function test_api_product_detail_public_access_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create seller account to own the product
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
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
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Create category for product classification
  const categoryData = {
    name: RandomGenerator.name(1),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create product with active status
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 4: Create unauthenticated connection to simulate guest user
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Retrieve product details using unauthenticated connection
  const publicProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(unauthenticatedConnection, {
      productId: product.id,
    });
  typia.assert(publicProduct);

  // Step 6: Validate product data matches and is accessible
  TestValidator.equals("product ID matches", publicProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    publicProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    publicProduct.description,
    product.description,
  );
}
