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
 * Test that sellers can update the product condition to correct initial
 * classification or reflect changes in product state.
 *
 * This test validates condition management ensuring accurate buyer expectations
 * and marketplace trust. Create a product initially marked as 'new', then
 * update the condition to 'refurbished' to reflect actual product state. Verify
 * that the condition update is persisted correctly.
 *
 * Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create product category for organization
 * 3. Create and authenticate seller account
 * 4. Create product sale with initial 'new' condition
 * 5. Update sale condition from 'new' to 'refurbished'
 * 6. Verify condition update persisted correctly
 */
export async function test_api_sale_update_condition_change(
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

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale with initial 'new' condition
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
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

  // Verify initial condition is 'new'
  TestValidator.equals(
    "initial sale condition should be new",
    createdSale.condition,
    "new",
  );

  // Step 5: Update sale condition from 'new' to 'refurbished'
  const updateData = {
    condition: "refurbished" as const,
  } satisfies IShoppingMallSale.IUpdate;

  const updatedSale = await api.functional.shoppingMall.seller.sales.update(
    connection,
    {
      saleCode: createdSale.code,
      body: updateData,
    },
  );
  typia.assert(updatedSale);

  // Step 6: Verify condition update persisted correctly
  TestValidator.equals(
    "updated sale condition should be refurbished",
    updatedSale.condition,
    "refurbished",
  );

  // Verify other properties remain unchanged
  TestValidator.equals(
    "sale ID should remain the same",
    updatedSale.id,
    createdSale.id,
  );
  TestValidator.equals(
    "sale code should remain the same",
    updatedSale.code,
    createdSale.code,
  );
  TestValidator.equals(
    "sale title should remain the same",
    updatedSale.title,
    createdSale.title,
  );
}
