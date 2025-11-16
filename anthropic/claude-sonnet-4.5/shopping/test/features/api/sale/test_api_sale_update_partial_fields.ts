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
 * Test partial update of product sale fields.
 *
 * This test validates that the PUT endpoint for updating product sales supports
 * partial updates, allowing sellers to modify only specific fields without
 * affecting other product properties. The test creates a complete product
 * listing with all fields populated, then updates only the title field and
 * verifies that all other fields (description, brand, dimensions, warranty,
 * etc.) remain unchanged.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a seller account
 * 2. Create an admin account and category for product classification
 * 3. Create a comprehensive product sale with all fields populated
 * 4. Update only the title field using PUT endpoint
 * 5. Verify that only title changed while all other fields remain identical
 */
export async function test_api_sale_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch back to seller and create comprehensive product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const originalTitle = RandomGenerator.paragraph({ sentences: 5 });
  const originalDescription = RandomGenerator.content({ paragraphs: 3 });
  const originalBrand = RandomGenerator.name(1);
  const originalWeight = typia.random<number>();
  const originalDimensionLength = typia.random<number>();
  const originalDimensionWidth = typia.random<number>();
  const originalDimensionHeight = typia.random<number>();
  const originalManufacturer = RandomGenerator.name(2);
  const originalWarrantyInfo = RandomGenerator.paragraph();

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: originalTitle,
        description: originalDescription,
        brand: originalBrand,
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({ sentences: 3 }),
        meta_keywords: RandomGenerator.name(3),
        weight: originalWeight,
        dimension_length: originalDimensionLength,
        dimension_width: originalDimensionWidth,
        dimension_height: originalDimensionHeight,
        manufacturer: originalManufacturer,
        return_policy_days: 30,
        warranty_info: originalWarrantyInfo,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 4: Update only the title field
  const newTitle = RandomGenerator.paragraph({ sentences: 5 });

  const updatedSale = await api.functional.shoppingMall.seller.sales.update(
    connection,
    {
      saleCode: sale.code,
      body: {
        title: newTitle,
      } satisfies IShoppingMallSale.IUpdate,
    },
  );
  typia.assert(updatedSale);

  // Step 5: Verify that only title changed, all other fields remain unchanged
  TestValidator.equals("title should be updated", updatedSale.title, newTitle);
  TestValidator.equals(
    "description should remain unchanged",
    updatedSale.description,
    originalDescription,
  );
  TestValidator.equals(
    "brand should remain unchanged",
    updatedSale.brand,
    originalBrand,
  );
  TestValidator.equals(
    "weight should remain unchanged",
    updatedSale.weight,
    originalWeight,
  );
  TestValidator.equals(
    "dimension_length should remain unchanged",
    updatedSale.dimension_length,
    originalDimensionLength,
  );
  TestValidator.equals(
    "dimension_width should remain unchanged",
    updatedSale.dimension_width,
    originalDimensionWidth,
  );
  TestValidator.equals(
    "dimension_height should remain unchanged",
    updatedSale.dimension_height,
    originalDimensionHeight,
  );
  TestValidator.equals(
    "manufacturer should remain unchanged",
    updatedSale.manufacturer,
    originalManufacturer,
  );
  TestValidator.equals(
    "warranty_info should remain unchanged",
    updatedSale.warranty_info,
    originalWarrantyInfo,
  );

  // Verify other critical fields remain the same
  TestValidator.equals(
    "sale ID should remain unchanged",
    updatedSale.id,
    sale.id,
  );
  TestValidator.equals(
    "sale code should remain unchanged",
    updatedSale.code,
    sale.code,
  );
  TestValidator.equals(
    "category should remain unchanged",
    updatedSale.category.id,
    sale.category.id,
  );
  TestValidator.equals(
    "condition should remain unchanged",
    updatedSale.condition,
    sale.condition,
  );
  TestValidator.equals(
    "return_policy_days should remain unchanged",
    updatedSale.return_policy_days,
    sale.return_policy_days,
  );
}
