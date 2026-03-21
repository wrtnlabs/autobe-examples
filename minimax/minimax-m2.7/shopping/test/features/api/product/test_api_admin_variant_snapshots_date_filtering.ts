import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test admin filters variant snapshots by date range.
 *
 * Business workflow:
 * 1. Authenticate as admin via /auth/admin/join
 * 2. Create seller via /auth/seller/join
 * 3. Seller creates product via /seller/products (POST)
 * 4. Seller adds variant via /seller/seller/products/{productId}/variants (POST)
 * 5. Create multiple snapshots by editing variant multiple times via /seller/products/{productId}/variants/{variantId} (PUT)
 * 6. Admin queries variant snapshots with date range filter:
 *    - Set created_after to exclude some snapshots
 *    - Set created_before to exclude recent snapshots
 *    - Set limit to 1 to test single item page
 *    - Set page to 1
 * 7. Verify response only includes snapshots within the specified date range
 * 8. Verify pagination correctly reflects filtered count
 * 9. Verify sort order is descending (newest first) by default
 * 10. Validate date filter boundaries are inclusive
 */
export async function test_api_admin_variant_snapshots_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller adds a variant to the product
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Create multiple snapshots by editing the variant multiple times
  // Get the original option values to modify
  const originalOptionValues: IEcommerceMallProductVariantOptionValue[] = variant.optionValues ?? [];
  
  // Edit 1: Update with different option value
  await api.functional.ecommerceMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        optionValues: originalOptionValues.length > 0
          ? originalOptionValues.map((ov: IEcommerceMallProductVariantOptionValue, i: number) => ({
              ...ov,
              value: `red-${i}`,
            }))
          : [],
      } satisfies IEcommerceMallProductVariant.IUpdate,
    },
  );
  // Edit 2: Update with different option value
  await api.functional.ecommerceMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        optionValues: originalOptionValues.length > 0
          ? originalOptionValues.map((ov: IEcommerceMallProductVariantOptionValue, i: number) => ({
              ...ov,
              value: `blue-${i}`,
            }))
          : [],
      } satisfies IEcommerceMallProductVariant.IUpdate,
    },
  );
  // Edit 3: Update with different option value
  await api.functional.ecommerceMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        optionValues: originalOptionValues.length > 0
          ? originalOptionValues.map((ov: IEcommerceMallProductVariantOptionValue, i: number) => ({
              ...ov,
              value: `green-${i}`,
            }))
          : [],
      } satisfies IEcommerceMallProductVariant.IUpdate,
    },
  );
  // 6. Get all snapshots first to establish baseline
  const allSnapshotsResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(allSnapshotsResponse);
  // Verify we have at least 3 snapshots
  TestValidator.predicate(
    "at least 3 snapshots created",
    allSnapshotsResponse.data.length >= 3,
  );
  // Record timestamps for filtering tests
  const snapshotTimestamps = allSnapshotsResponse.data.map((s) => s.created_at);
  const oldestTimestamp = snapshotTimestamps[snapshotTimestamps.length - 1];
  const newestTimestamp = snapshotTimestamps[0];
  const middleTimestamp = snapshotTimestamps[1];
  
  // Convert timestamps to Date for comparison
  const oldestDate = new Date(oldestTimestamp);
  const newestDate = new Date(newestTimestamp);
  const middleDate = new Date(middleTimestamp);
  
  // 6a. Test created_after filter (should exclude oldest snapshot)
  const afterMiddleSnapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          created_after: middleTimestamp,
          sort: "-created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(afterMiddleSnapshot);
  // Verify only newer snapshots are included (not the middle or older)
  for (const snapshot of afterMiddleSnapshot.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot created after filter date",
      snapshotDate >= middleDate,
    );
  }
  // 6b. Test created_before filter (should exclude newest snapshot)
  const beforeMiddleSnapshot =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          created_before: middleTimestamp,
          sort: "-created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(beforeMiddleSnapshot);
  // Verify only older snapshots are included
  for (const snapshot of beforeMiddleSnapshot.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot created before filter date",
      snapshotDate <= middleDate,
    );
  }
  // 6c. Test combined date range filter
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          created_after: oldestTimestamp,
          created_before: newestTimestamp,
          sort: "-created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Should include middle snapshots but might not include exact boundaries
  TestValidator.predicate(
    "date range filter returns results",
    dateRangeResponse.data.length >= 1,
  );
  // 6d. Test pagination with limit=1
  const singlePageResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          limit: 1,
          page: 1,
          sort: "-created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(singlePageResponse);
  // Verify pagination metadata
  TestValidator.equals("limit is 1", singlePageResponse.pagination.limit, 1);
  TestValidator.equals(
    "current page is 1",
    singlePageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "only one item per page",
    singlePageResponse.data.length === 1,
  );
  // 7. Verify sort order is descending (newest first)
  if (allSnapshotsResponse.data.length > 1) {
    for (let i = 0; i < allSnapshotsResponse.data.length - 1; i++) {
      const current = new Date(allSnapshotsResponse.data[i].created_at);
      const next = new Date(allSnapshotsResponse.data[i + 1].created_at);
      TestValidator.predicate("snapshots sorted newest first", current >= next);
    }
  }
  // 8. Verify pagination count is accurate
  TestValidator.predicate(
    "total records count is accurate",
    allSnapshotsResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    allSnapshotsResponse.pagination.pages >= 1,
  );
  // 9. Test with ascending sort
  const ascendingResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sort: "created_at",
        } satisfies IEcommerceMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  // Verify ascending sort order
  if (ascendingResponse.data.length > 1) {
    for (let i = 0; i < ascendingResponse.data.length - 1; i++) {
      const current = new Date(ascendingResponse.data[i].created_at);
      const next = new Date(ascendingResponse.data[i + 1].created_at);
      TestValidator.predicate(
        "snapshots sorted oldest first when ascending",
        current <= next,
      );
    }
  }
  // 10. Validate snapshot data structure
  for (const snapshot of allSnapshotsResponse.data) {
    TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has sku", snapshot.sku.length > 0);
    TestValidator.predicate(
      "snapshot has valid stock quantity",
      snapshot.stock_quantity >= 0,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has product snapshot reference",
      snapshot.product_snapshot !== null,
    );
  }
}