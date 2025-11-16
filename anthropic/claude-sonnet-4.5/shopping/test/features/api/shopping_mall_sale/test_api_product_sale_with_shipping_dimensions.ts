import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product sale creation with complete shipping information including
 * weight and dimensions.
 *
 * This scenario validates that sellers can provide shipping calculation data
 * when creating product listings. The test creates a complete workflow from
 * admin category setup through seller authentication to product creation with
 * full shipping metadata.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates product category
 * 2. Seller authenticates via join
 * 3. Seller creates product sale listing with weight and dimension fields
 *    populated
 *
 * Validation points:
 *
 * - Verify sale is created with weight in kilograms for shipping cost calculation
 * - Confirm dimension_length, dimension_width, dimension_height are stored in
 *   centimeters
 * - Validate that dimensional data enables accurate shipping cost estimation
 * - Test that weight and dimensions are optional but recommended for physical
 *   products
 * - Ensure shipping information is available for logistics and carrier
 *   integration
 */
export async function test_api_product_sale_with_shipping_dimensions(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to create product category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category for sale listing
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller authenticates via join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale with complete shipping dimensions
  // Generate realistic shipping data: weight 0.1-100kg, dimensions 1-300cm
  const weight = typia.random<number & tags.Minimum<0.1> & tags.Maximum<100>>();
  const dimensionLength = typia.random<
    number & tags.Minimum<1> & tags.Maximum<300>
  >();
  const dimensionWidth = typia.random<
    number & tags.Minimum<1> & tags.Maximum<300>
  >();
  const dimensionHeight = typia.random<
    number & tags.Minimum<1> & tags.Maximum<300>
  >();

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 3 }),
        weight: weight,
        dimension_length: dimensionLength,
        dimension_width: dimensionWidth,
        dimension_height: dimensionHeight,
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Validate shipping information is properly stored
  TestValidator.equals("sale weight in kilograms", sale.weight, weight);
  TestValidator.equals(
    "sale dimension length in centimeters",
    sale.dimension_length,
    dimensionLength,
  );
  TestValidator.equals(
    "sale dimension width in centimeters",
    sale.dimension_width,
    dimensionWidth,
  );
  TestValidator.equals(
    "sale dimension height in centimeters",
    sale.dimension_height,
    dimensionHeight,
  );

  // Validate that category assignment is correct
  TestValidator.equals("category ID matches", sale.category.id, category.id);

  // Validate seller ownership
  TestValidator.equals("seller ID matches", sale.seller.id, seller.id);
}
