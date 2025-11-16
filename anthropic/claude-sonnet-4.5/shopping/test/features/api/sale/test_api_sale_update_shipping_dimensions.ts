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
 * Test that sellers can update product shipping dimensions (length, width,
 * height) and weight to ensure accurate shipping cost calculations.
 *
 * This test validates the ability to correct or add shipping information that
 * affects logistics and carrier compatibility. The workflow includes:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category as admin
 * 3. Create seller account and authenticate
 * 4. Create product sale without dimensional information
 * 5. Update product with weight and all three dimensions
 * 6. Verify shipping specifications are correctly stored and returned
 */
export async function test_api_sale_update_shipping_dimensions(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product category as admin
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.content({ paragraphs: 2 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale WITHOUT dimensional information
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    condition: "new" as const,
    return_policy_days: 30 as const,
  } satisfies IShoppingMallSale.ICreate;

  const createdSale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(createdSale);

  // Verify initial sale has no dimensional data
  TestValidator.predicate(
    "initial weight should be null or undefined",
    createdSale.weight === null || createdSale.weight === undefined,
  );
  TestValidator.predicate(
    "initial length should be null or undefined",
    createdSale.dimension_length === null ||
      createdSale.dimension_length === undefined,
  );
  TestValidator.predicate(
    "initial width should be null or undefined",
    createdSale.dimension_width === null ||
      createdSale.dimension_width === undefined,
  );
  TestValidator.predicate(
    "initial height should be null or undefined",
    createdSale.dimension_height === null ||
      createdSale.dimension_height === undefined,
  );

  // Step 5: Update product with weight and all three dimensions
  const updateData = {
    weight: 2.5,
    dimension_length: 30.0,
    dimension_width: 20.0,
    dimension_height: 15.0,
  } satisfies IShoppingMallSale.IUpdate;

  const updatedSale = await api.functional.shoppingMall.seller.sales.update(
    connection,
    {
      saleCode: createdSale.code,
      body: updateData,
    },
  );
  typia.assert(updatedSale);

  // Step 6: Verify shipping specifications are correctly stored and returned
  TestValidator.equals("updated weight matches", updatedSale.weight, 2.5);
  TestValidator.equals(
    "updated length matches",
    updatedSale.dimension_length,
    30.0,
  );
  TestValidator.equals(
    "updated width matches",
    updatedSale.dimension_width,
    20.0,
  );
  TestValidator.equals(
    "updated height matches",
    updatedSale.dimension_height,
    15.0,
  );

  // Verify other product properties remain unchanged
  TestValidator.equals(
    "sale code unchanged",
    updatedSale.code,
    createdSale.code,
  );
  TestValidator.equals("title unchanged", updatedSale.title, createdSale.title);
  TestValidator.equals(
    "category unchanged",
    updatedSale.category.id,
    category.id,
  );
}
