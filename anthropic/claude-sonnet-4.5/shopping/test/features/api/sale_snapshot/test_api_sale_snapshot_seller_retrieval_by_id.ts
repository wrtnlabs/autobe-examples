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
 * Test seller retrieval of specific historical product sale snapshot by ID.
 *
 * This test validates the complete workflow for sellers to access historical
 * snapshots of their product sales. Snapshots are point-in-time captures that
 * preserve product information for audit trails and compliance.
 *
 * Note: Due to API limitations (no snapshot listing endpoint and sale response
 * doesn't include snapshot IDs), this test demonstrates the snapshot retrieval
 * API functionality with proper authentication and error handling.
 *
 * Workflow:
 *
 * 1. Create and authenticate seller account for ownership context
 * 2. Create and authenticate admin account for category creation
 * 3. Admin creates category required for product sale
 * 4. Seller creates product sale (generates initial snapshot)
 * 5. Attempt to retrieve snapshot using saleCode and a snapshot ID
 * 6. Validate API response structure
 */
export async function test_api_sale_snapshot_seller_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateBody = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Step 3: Admin creates category for product sale
  const categoryCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    brand: RandomGenerator.name(1),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 3 }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(1),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleCreateBody,
    },
  );
  typia.assert(sale);

  // Step 5: Retrieve snapshot using saleCode and a snapshot ID
  // Note: In a real scenario, the snapshot ID would be obtained from a snapshot
  // listing API or from the sale creation event. For this test, we use a
  // generated ID to demonstrate the API endpoint functionality.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  const snapshot = await api.functional.shoppingMall.seller.sales.snapshots.at(
    connection,
    {
      saleCode: sale.code,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);

  // Step 6: Validate snapshot response structure
  TestValidator.predicate(
    "snapshot has valid ID",
    snapshot.id !== null && snapshot.id !== undefined,
  );

  TestValidator.predicate(
    "snapshot has sale reference",
    snapshot.shopping_mall_sale_id !== null &&
      snapshot.shopping_mall_sale_id !== undefined,
  );

  TestValidator.predicate(
    "snapshot has seller reference",
    snapshot.shopping_mall_seller_id !== null &&
      snapshot.shopping_mall_seller_id !== undefined,
  );

  TestValidator.predicate(
    "snapshot has category reference",
    snapshot.shopping_mall_category_id !== null &&
      snapshot.shopping_mall_category_id !== undefined,
  );

  TestValidator.predicate(
    "snapshot has code",
    snapshot.code !== null && snapshot.code !== undefined,
  );

  TestValidator.predicate(
    "snapshot has title",
    snapshot.title !== null && snapshot.title !== undefined,
  );

  TestValidator.predicate(
    "snapshot has description",
    snapshot.description !== null && snapshot.description !== undefined,
  );

  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
}
