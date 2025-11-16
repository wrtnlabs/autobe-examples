import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test snapshot filtering by product status at snapshot time.
 *
 * This test validates the snapshot query functionality with status filtering:
 *
 * 1. Admin authentication for snapshot access
 * 2. Seller authentication and sale creation
 * 3. Category setup for product organization
 * 4. Sale creation with specific status
 * 5. Snapshot retrieval with status filtering
 * 6. Validation of filtered results
 *
 * The test verifies that the status parameter correctly filters snapshots to
 * return only those where the product had the specified status at snapshot
 * capture time.
 */
export async function test_api_sale_snapshots_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
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

  // Step 2: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.content({ paragraphs: 1 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Switch to admin and create category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph(),
    image_url: typia.random<string & tags.Format<"uri">>(),
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

  // Step 4: Switch to seller and create sale with published status
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    meta_keywords: ArrayUtil.repeat(3, () => RandomGenerator.name(1)).join(
      ", ",
    ),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph(),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Switch back to admin to query snapshots
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Query snapshots with status filter for "published"
  const publishedSnapshotsRequest = {
    shopping_mall_sale_id: sale.id,
    status: "published",
    limit: 10,
    page: 1,
    sort: "-created_at" as const,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const publishedSnapshots =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: publishedSnapshotsRequest,
    });
  typia.assert(publishedSnapshots);

  // Step 7: Validate that all returned snapshots have "published" status
  TestValidator.predicate(
    "all snapshots should have published status",
    publishedSnapshots.data.every(
      (snapshot) => snapshot.status === "published",
    ),
  );

  // Step 8: Query snapshots without status filter
  const allSnapshotsRequest = {
    shopping_mall_sale_id: sale.id,
    limit: 10,
    page: 1,
    sort: "-created_at" as const,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const allSnapshots =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: allSnapshotsRequest,
    });
  typia.assert(allSnapshots);

  // Step 9: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    allSnapshots.pagination.current >= 1 &&
      allSnapshots.pagination.limit >= 1 &&
      allSnapshots.pagination.records >= 0 &&
      allSnapshots.pagination.pages >= 0,
  );

  // Step 10: Test filtering with draft status (should return empty or no matches)
  const draftSnapshotsRequest = {
    shopping_mall_sale_id: sale.id,
    status: "draft",
    limit: 10,
    page: 1,
  } satisfies IShoppingMallSaleSnapshot.IRequest;

  const draftSnapshots =
    await api.functional.shoppingMall.admin.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: draftSnapshotsRequest,
    });
  typia.assert(draftSnapshots);

  TestValidator.predicate(
    "draft status filter should not return published snapshots",
    draftSnapshots.data.every((snapshot) => snapshot.status === "draft"),
  );
}
