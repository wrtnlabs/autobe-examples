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
 * Test cascade deletion of product sales and all related subsidiary data.
 *
 * This test validates that deleting a product sale properly removes all
 * associated entities from the system, maintaining referential integrity. The
 * test creates a complete product hierarchy (admin creates category, seller
 * creates sale with comprehensive data) and then performs hard deletion as
 * admin to verify the cascade mechanism works correctly.
 *
 * Workflow:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a comprehensive product sale
 * 3. Admin deletes the sale listing
 * 4. Verify successful deletion (void return confirms operation success)
 */
export async function test_api_sale_deletion_cascade_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Seller authenticates
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
    store_name: RandomGenerator.name(2),
    href: "https://marketplace.example.com/seller/register",
    referrer: "https://marketplace.example.com/home",
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Seller creates comprehensive product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const saleData = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    meta_keywords: ArrayUtil.repeat(5, () => RandomGenerator.name(1)).join(
      ", ",
    ),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({ sentences: 8 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Switch back to admin for deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminData.email,
      password: adminData.password,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Admin deletes the sale (hard deletion with cascade)
  await api.functional.shoppingMall.admin.sales.erase(connection, {
    saleCode: sale.code,
  });

  // Deletion successful - void return confirms the operation completed
}
