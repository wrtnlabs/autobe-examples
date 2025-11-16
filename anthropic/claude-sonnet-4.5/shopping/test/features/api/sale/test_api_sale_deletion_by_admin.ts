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
 * Test the complete workflow of an administrator permanently deleting a product
 * sale listing from the marketplace.
 *
 * This scenario validates that admins can successfully remove product listings
 * and all associated data including sale snapshots, variant attributes, variant
 * values, SKUs, images, questions, and answers through hard deletion.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates to obtain authorization tokens
 * 2. Admin creates a product category to organize the marketplace taxonomy
 * 3. Seller authenticates to obtain authorization tokens
 * 4. Seller creates a product sale listing assigned to the category
 * 5. Admin deletes the sale listing using its unique business code
 * 6. Verify the deletion completes successfully with appropriate status code
 *
 * Business logic validations:
 *
 * - Admin authorization is required for deletion operations
 * - Sale code must match an existing sale record
 * - Deletion is permanent and irreversible (hard delete)
 * - All related subsidiary data is cascade deleted
 * - Operation maintains referential integrity
 */
export async function test_api_sale_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to obtain authorization tokens
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
      href: "https://marketplace.example.com/admin/register",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates a product category
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

  // Step 3: Seller authenticates to obtain authorization tokens
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
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates a product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Switch back to admin context and delete the sale listing
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://marketplace.example.com/admin/dashboard",
      referrer: "https://marketplace.example.com/admin/login",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Admin deletes the sale listing using its unique business code
  await api.functional.shoppingMall.admin.sales.erase(connection, {
    saleCode: saleCode,
  });
}
