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
 * Test category reassignment functionality for product sales.
 *
 * This test validates that sellers can successfully reassign products from one
 * category to another, which is essential for correcting categorization errors
 * and adapting to marketplace taxonomy changes.
 *
 * Test flow:
 *
 * 1. Create admin account and authenticate
 * 2. Create two distinct product categories
 * 3. Create seller account and authenticate
 * 4. Create a product sale assigned to the first category
 * 5. Update the product to reassign it to the second category
 * 6. Verify the category foreign key is updated correctly
 */
export async function test_api_sale_update_category_reassignment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
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

  // Step 2: Create two categories for reassignment testing
  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: `Category ${RandomGenerator.name(1)}`,
        slug: `category-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category1);

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: `Category ${RandomGenerator.name(1)}`,
        slug: `category-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category2);

  // Step 3: Create and authenticate as seller for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create a product sale initially assigned to category1
  const saleCode = `SALE-${RandomGenerator.alphaNumeric(12)}`;

  const initialSale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: saleCode,
        shopping_mall_category_id: category1.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 10,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(initialSale);

  // Verify initial category assignment
  TestValidator.equals(
    "initial category assignment",
    initialSale.category.id,
    category1.id,
  );

  // Step 5: Update the product to reassign it to category2
  const updatedSale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.update(connection, {
      saleCode: saleCode,
      body: {
        shopping_mall_category_id: category2.id,
      } satisfies IShoppingMallSale.IUpdate,
    });
  typia.assert(updatedSale);

  // Step 6: Validate category reassignment was successful
  TestValidator.equals(
    "category reassigned successfully",
    updatedSale.category.id,
    category2.id,
  );

  TestValidator.notEquals(
    "category changed from original",
    updatedSale.category.id,
    category1.id,
  );

  // Verify other product properties remained unchanged
  TestValidator.equals(
    "product code unchanged",
    updatedSale.code,
    initialSale.code,
  );

  TestValidator.equals(
    "product title unchanged",
    updatedSale.title,
    initialSale.title,
  );
}
