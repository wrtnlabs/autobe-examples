import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test date range filtering capabilities for product snapshot history.
 *
 * This scenario validates that:
 * 1. 'from' parameter correctly filters snapshots created at or after the specified timestamp
 * 2. 'to' parameter correctly filters snapshots created at or before the specified timestamp
 * 3. Combining 'from' and 'to' parameters creates an inclusive date range filter
 * 4. Snapshot results within the date range are returned correctly
 * 5. Snapshots outside the date range are excluded from results
 * 6. Empty results are returned when no snapshots fall within the specified date range
 * 7. Date filtering works alongside pagination (filters applied before pagination)
 */
export async function test_api_product_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product (this creates an initial snapshot)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Record the product creation timestamp
  const productCreatedAt = product.created_at;
  const productCreatedAtDate = new Date(productCreatedAt);
  // 3. Test: Get all snapshots without date filter (baseline)
  const allSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Should have at least one snapshot from product creation
  TestValidator.predicate(
    "product should have at least one snapshot",
    allSnapshots.data.length > 0,
  );
  // 4. Test: Filter with 'from' parameter set to product creation time
  const fromFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          from: productCreatedAt,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(fromFilterResult);
  // All returned snapshots should have created_at >= from
  for (const snapshot of fromFilterResult.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at >= from filter`,
      snapshotDate >= productCreatedAtDate,
    );
  }
  // 5. Test: Filter with 'to' parameter set to current time
  const now = new Date().toISOString();
  const toFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          to: now,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(toFilterResult);
  // All returned snapshots should have created_at <= to
  const toDate = new Date(now);
  for (const snapshot of toFilterResult.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at <= to filter`,
      snapshotDate <= toDate,
    );
  }
  // 6. Test: Filter with both 'from' and 'to' defining a specific range
  const rangeStart = productCreatedAt;
  const rangeEnd = new Date(
    productCreatedAtDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 24 hours after creation
  const rangeFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          from: rangeStart,
          to: rangeEnd,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(rangeFilterResult);
  // All returned snapshots should be within the date range
  const rangeStartDate = new Date(rangeStart);
  const rangeEndDate = new Date(rangeEnd);
  for (const snapshot of rangeFilterResult.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} within date range`,
      snapshotDate >= rangeStartDate && snapshotDate <= rangeEndDate,
    );
  }
  // 7. Test: Filter with a date range where no snapshots exist (future dates)
  const futureStart = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year from now
  const futureEnd = new Date(
    Date.now() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year + 1 day from now
  const futureFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          from: futureStart,
          to: futureEnd,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(futureFilterResult);
  // Should return empty results for future date range
  TestValidator.equals(
    "future date range should return empty results",
    futureFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    futureFilterResult.pagination.records,
    0,
  );
  // 8. Test: Date filtering works alongside pagination
  const paginatedResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          from: productCreatedAt,
          to: now,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination is applied after date filtering
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResult.data.length <= 10,
  );
  // All paginated results should still be within the date range
  for (const snapshot of paginatedResult.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `paginated snapshot ${snapshot.id} within date range`,
      snapshotDate >= productCreatedAtDate && snapshotDate <= toDate,
    );
  }
}
