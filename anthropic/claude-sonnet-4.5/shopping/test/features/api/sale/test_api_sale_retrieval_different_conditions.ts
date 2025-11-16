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
 * Test retrieval of product sales with different condition types (new,
 * refurbished, used) to validate that product condition is correctly stored and
 * returned.
 *
 * This test ensures buyers receive accurate product state information by:
 *
 * 1. Authenticating as seller to create product listings
 * 2. Creating admin account for category management
 * 3. Creating a product category
 * 4. Creating three separate sales with different conditions (new, refurbished,
 *    used)
 * 5. Retrieving each sale and verifying the condition value matches what was set
 *
 * This validates that condition classification is properly maintained
 * throughout the sale lifecycle and prevents condition data corruption or
 * loss.
 */
export async function test_api_sale_retrieval_different_conditions(
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
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account for category creation
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

  // Step 3: Login as admin to create category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 4: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Switch back to seller account
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Create three sales with different conditions
  const conditions = ["new", "refurbished", "used"] as const;
  const createdSales: IShoppingMallSale[] = [];

  for (const condition of conditions) {
    const sale = await api.functional.shoppingMall.seller.sales.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          shopping_mall_category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          condition: condition,
          return_policy_days: 30 as const,
          brand: RandomGenerator.name(1),
          weight: typia.random<number>(),
          dimension_length: typia.random<number>(),
          dimension_width: typia.random<number>(),
          dimension_height: typia.random<number>(),
        } satisfies IShoppingMallSale.ICreate,
      },
    );
    typia.assert(sale);
    createdSales.push(sale);
  }

  // Step 7: Retrieve each sale and verify condition matches
  for (let i = 0; i < createdSales.length; i++) {
    const createdSale = createdSales[i];
    const expectedCondition = conditions[i];

    const retrievedSale = await api.functional.shoppingMall.sales.at(
      connection,
      {
        saleCode: createdSale.code,
      },
    );
    typia.assert(retrievedSale);

    // Verify the condition matches exactly
    TestValidator.equals(
      `sale with code ${createdSale.code} should have condition ${expectedCondition}`,
      retrievedSale.condition,
      expectedCondition,
    );

    // Verify the retrieved sale ID matches
    TestValidator.equals(
      `retrieved sale ID should match created sale ID for ${expectedCondition} condition`,
      retrievedSale.id,
      createdSale.id,
    );
  }
}
