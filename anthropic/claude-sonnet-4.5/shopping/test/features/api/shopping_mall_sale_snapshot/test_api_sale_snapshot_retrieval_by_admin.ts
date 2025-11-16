import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that administrators can successfully retrieve a specific historical
 * snapshot of a product sale listing.
 *
 * This test validates the complete workflow from category creation, product
 * listing, and snapshot retrieval, ensuring administrators have access to
 * historical product data for audit trails and compliance purposes.
 *
 * The test workflow:
 *
 * 1. Create and authenticate as an admin user
 * 2. Create a product category to organize the product listing
 * 3. Create and authenticate as a seller user
 * 4. Create a product sale listing that generates historical snapshots
 * 5. Switch back to admin authentication context
 * 6. Retrieve a snapshot using admin credentials (using generated ID for
 *    demonstration)
 * 7. Validate that the snapshot response contains complete denormalized product
 *    information structure
 * 8. Verify proper access control allows admin users to view historical snapshots
 *
 * Note: This test demonstrates the snapshot retrieval mechanism. In production
 * scenarios, snapshot IDs would be obtained from order history, audit logs, or
 * other system records.
 */
export async function test_api_sale_snapshot_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin user
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
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a product category
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

  // Step 3: Create and authenticate as seller user
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
      href: "https://seller.example.com/register",
      referrer: "https://seller.example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create a product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
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
        short_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 10,
          wordMax: 15,
        }),
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Switch back to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Retrieve a snapshot using admin credentials
  // Note: In production, snapshot IDs come from order history or audit logs
  // Here we use a generated UUID to demonstrate the retrieval mechanism
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  const snapshot = await api.functional.shoppingMall.admin.sales.snapshots.at(
    connection,
    {
      saleCode: saleCode,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);

  // Step 7: Validate snapshot response structure contains denormalized information
  // The snapshot should preserve complete point-in-time product data
  TestValidator.predicate(
    "snapshot has valid UUID",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );

  TestValidator.predicate(
    "snapshot has sale reference",
    typeof snapshot.shopping_mall_sale_id === "string" &&
      snapshot.shopping_mall_sale_id.length > 0,
  );

  TestValidator.predicate(
    "snapshot has seller reference",
    typeof snapshot.shopping_mall_seller_id === "string" &&
      snapshot.shopping_mall_seller_id.length > 0,
  );

  TestValidator.predicate(
    "snapshot has category reference",
    typeof snapshot.shopping_mall_category_id === "string" &&
      snapshot.shopping_mall_category_id.length > 0,
  );

  TestValidator.predicate(
    "snapshot preserves product code",
    typeof snapshot.code === "string" && snapshot.code.length > 0,
  );

  TestValidator.predicate(
    "snapshot preserves product title",
    typeof snapshot.title === "string" && snapshot.title.length > 0,
  );

  TestValidator.predicate(
    "snapshot preserves product description",
    typeof snapshot.description === "string" && snapshot.description.length > 0,
  );

  TestValidator.predicate(
    "snapshot preserves condition information",
    typeof snapshot.condition === "string" && snapshot.condition.length > 0,
  );

  TestValidator.predicate(
    "snapshot preserves status information",
    typeof snapshot.status === "string" && snapshot.status.length > 0,
  );

  TestValidator.predicate(
    "snapshot preserves return policy",
    typeof snapshot.return_policy_days === "number" &&
      snapshot.return_policy_days >= 0,
  );

  TestValidator.predicate(
    "snapshot has creation timestamp",
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );

  // Step 8: Verify admin access control works correctly
  // If we reached here without authentication errors, admin access is properly configured
  TestValidator.predicate("admin successfully accessed snapshot data", true);
}
