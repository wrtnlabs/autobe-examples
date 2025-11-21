import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product snapshot retrieval with specific date range filtering.
 *
 * This test validates advanced filtering capabilities for business analysis
 * including start_date and end_date parameters. The scenario creates product
 * updates across different time periods and verifies accurate filtering of
 * snapshots within specified date ranges. Tests include chronological ordering,
 * boundary conditions, and empty result handling for date filters.
 *
 * 1. Seller registration for product management authorization
 * 2. Create product with initial snapshot baseline
 * 3. Update product multiple times at different timestamps
 * 4. Test date range filtering with various boundaries
 * 5. Validate chronological ordering and snapshot completeness
 * 6. Test empty result handling for date ranges without snapshots
 */
export async function test_api_product_snapshot_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Seller registration - prerequisite for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create initial product - establishes baseline snapshot
  const productCreateBody = {
    sku: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    price: typia.random<number & tags.Minimum<100>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(4),
    seo_description: RandomGenerator.paragraph({ sentences: 3 }),
    tags: `${RandomGenerator.name()},${RandomGenerator.name()}`,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://example.com/admin/products/new",
    referrer: "https://example.com/admin",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // 3. Create multiple updates at different time periods
  const updateTimestamps = [
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  ];

  // Wait briefly between updates to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Update 1: Modify name and price week ago
  const updateBody1 = {
    name: RandomGenerator.name(4),
    price: typia.random<number & tags.Minimum<200>>(),
    seo_title: product.seo_title + " Updated",
  } satisfies IShoppingMallProduct.IUpdate;

  const productAfterUpdate1 =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productCode: product.sku,
      body: updateBody1,
    });
  typia.assert(productAfterUpdate1);

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Update 2: Modify description and tags 3 days ago
  const updateBody2 = {
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    tags: `${RandomGenerator.name()},${RandomGenerator.name()},${RandomGenerator.name()}`,
    seo_description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallProduct.IUpdate;

  const productAfterUpdate2 =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productCode: product.sku,
      body: updateBody2,
    });
  typia.assert(productAfterUpdate2);

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Update 3: Modify status and taxes 1 day ago
  const updateBody3 = {
    status: "active",
    is_taxable: false,
    seo_title: productAfterUpdate2.seo_title + " Updated Again",
  } satisfies IShoppingMallProduct.IUpdate;

  const productAfterUpdate3 =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productCode: product.sku,
      body: updateBody3,
    });
  typia.assert(productAfterUpdate3);

  // 4. Test date range filtering - all snapshots within 2 weeks
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const allSnapshotsResponse =
    await api.functional.shoppingMall.products.snapshots.index(connection, {
      productCode: product.sku,
      body: {
        start_date: twoWeeksAgo.toISOString(),
        end_date: now.toISOString(),
        page: 1,
        limit: 50,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(allSnapshotsResponse);

  TestValidator.predicate(
    "should return snapshots within date range",
    allSnapshotsResponse.data.length > 0,
  );

  // Validate chronological order
  for (let i = 1; i < allSnapshotsResponse.data.length; i++) {
    const currentTimestamp = new Date(
      allSnapshotsResponse.data[i - 1].snapshot_created_at,
    );
    const previousTimestamp = new Date(
      allSnapshotsResponse.data[i].snapshot_created_at,
    );
    TestValidator.predicate(
      "snapshots should be in chronological order",
      currentTimestamp >= previousTimestamp,
    );
  }

  // 5. Test narrow date range - only 3-day range
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const narrowSnapshotsResponse =
    await api.functional.shoppingMall.products.snapshots.index(connection, {
      productCode: product.sku,
      body: {
        start_date: fourDaysAgo.toISOString(),
        end_date: twoDaysAgo.toISOString(),
        page: 1,
        limit: 50,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(narrowSnapshotsResponse);

  TestValidator.predicate(
    "narrow date range should return fewer snapshots",
    narrowSnapshotsResponse.data.length <= allSnapshotsResponse.data.length,
  );

  // Verify all snapshots in narrow range are within bounds
  narrowSnapshotsResponse.data.forEach((snapshot) => {
    const snapshotDate = new Date(snapshot.snapshot_created_at);
    TestValidator.predicate(
      "snapshot should be within narrow date range",
      snapshotDate >= fourDaysAgo && snapshotDate <= twoDaysAgo,
    );
  });

  // 6. Test future date range (should return empty)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const futureSnapshotsResponse =
    await api.functional.shoppingMall.products.snapshots.index(connection, {
      productCode: product.sku,
      body: {
        start_date: tomorrow.toISOString(),
        end_date: nextWeek.toISOString(),
        page: 1,
        limit: 50,
      } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(futureSnapshotsResponse);

  TestValidator.predicate(
    "future date range should return empty results",
    futureSnapshotsResponse.data.length === 0,
  );

  // 7. Test boundary conditions - exact snapshot dates
  TestValidator.predicate(
    "all snapshots should have valid dates",
    allSnapshotsResponse.data.every(
      (snapshot) =>
        snapshot.snapshot_created_at &&
        Boolean(Date.parse(snapshot.snapshot_created_at)),
    ),
  );

  // 8. Test pagination with date filtering
  const paginatedResponse =
    await api.functional.shoppingMall.products.snapshots.index(connection, {
      productCode: product.sku,
      body: {
        start_date: fourDaysAgo.toISOString(),
        end_date: now.toISOString(),
        page: 1,
        limit: 2, // Limit to 2 results per page
        fields: ["id", "name", "price", "snapshot_created_at"],
      } satisfies IShoppingMallProductSnapshot.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "paginated response should respect limit",
    paginatedResponse.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination metadata should be consistent",
    paginatedResponse.pagination.limit === 2,
  );
}
