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
 * Test creating product sales with different return_policy_days values.
 *
 * This test validates that sellers can set various return windows from no
 * returns to extended return periods. Authenticate as admin for category,
 * authenticate as seller, then create multiple products with different
 * return_policy_days values: 0 (no returns), 7 (one week), 14 (two weeks), 30
 * (one month), and 60 (two months). Verify that each sale is created with the
 * specified return policy and that buyers can see the return window clearly.
 */
export async function test_api_product_sale_return_policy_variants(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a product category for sales
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller account
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Define return policy variants to test
  const returnPolicyDays = [0, 7, 14, 30, 60] as const;

  // Step 5: Create product sales with each return policy variant
  const createdSales: IShoppingMallSale[] = [];

  for (const policyDays of returnPolicyDays) {
    const saleData = {
      code: RandomGenerator.alphaNumeric(12),
      shopping_mall_category_id: category.id,
      title: `Product with ${policyDays} day return policy`,
      description: RandomGenerator.content({ paragraphs: 3 }),
      brand: RandomGenerator.name(1),
      condition: "new" as const,
      return_policy_days: policyDays,
      warranty_info:
        policyDays > 0
          ? `This product can be returned within ${policyDays} days of delivery.`
          : "No returns accepted for this product.",
    } satisfies IShoppingMallSale.ICreate;

    const sale = await api.functional.shoppingMall.seller.sales.create(
      connection,
      {
        body: saleData,
      },
    );
    typia.assert(sale);

    createdSales.push(sale);
  }

  // Step 6: Verify all sales were created with correct return policies
  TestValidator.equals(
    "all return policy variants created",
    createdSales.length,
    returnPolicyDays.length,
  );

  // Step 7: Validate each sale has the correct return_policy_days value
  for (let i = 0; i < createdSales.length; i++) {
    const sale = createdSales[i];
    const expectedDays = returnPolicyDays[i];

    TestValidator.equals(
      `sale ${i} has correct return policy days`,
      sale.return_policy_days,
      expectedDays,
    );

    TestValidator.predicate(
      `sale ${i} belongs to seller`,
      sale.seller.id === seller.id,
    );

    TestValidator.predicate(
      `sale ${i} belongs to category`,
      sale.category.id === category.id,
    );
  }

  // Step 8: Verify the range of return policies
  TestValidator.predicate(
    "no returns policy exists",
    createdSales.some((sale) => sale.return_policy_days === 0),
  );

  TestValidator.predicate(
    "one week return policy exists",
    createdSales.some((sale) => sale.return_policy_days === 7),
  );

  TestValidator.predicate(
    "two weeks return policy exists",
    createdSales.some((sale) => sale.return_policy_days === 14),
  );

  TestValidator.predicate(
    "one month return policy exists",
    createdSales.some((sale) => sale.return_policy_days === 30),
  );

  TestValidator.predicate(
    "two months return policy exists",
    createdSales.some((sale) => sale.return_policy_days === 60),
  );
}
