import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product creation with non-existent category ID to validate proper
 * validation of category relationships.
 *
 * This test ensures that the marketplace catalog system prevents product
 * creation with invalid category references, maintaining data integrity by
 * verifying that products can only be created within existing, valid
 * categories. The test demonstrates how the system handles attempts to create
 * orphaned products and protects the organizational structure of the catalog by
 * enforcing proper category validation during the product creation process.
 *
 * Test Flow:
 *
 * 1. Create a seller account to establish proper authentication context
 * 2. Generate a non-existent category ID using UUID format
 * 3. Attempt to create a product with the invalid category ID
 * 4. Validate that the system properly rejects the invalid reference
 * 5. Verify appropriate error handling for category not found scenario
 */
export async function test_api_seller_product_creation_invalid_category(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account to establish proper authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Generate a non-existent category ID using UUID format
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to create a product with the invalid category ID
  // Step 4: Validate that the system properly rejects the invalid reference
  await TestValidator.error(
    "product creation should fail with non-existent category ID",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
          condition: "new",
          weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          category_id: invalidCategoryId, // Invalid category ID
          shopping_mall_seller_id: seller.id,
          seo_title: RandomGenerator.name(3),
          seo_description: RandomGenerator.paragraph({ sentences: 2 }),
          href: "https://marketplace.example.com/seller/dashboard/products/create",
          referrer: "https://marketplace.example.com/seller/dashboard",
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Step 5: Verify appropriate error handling for category not found scenario
  // The error is already validated by TestValidator.error, confirming the system
  // properly validates category relationships and prevents orphaned products.
}
