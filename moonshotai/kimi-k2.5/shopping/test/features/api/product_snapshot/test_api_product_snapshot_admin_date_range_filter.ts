import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test filtering product snapshots by creation date range using created_at_from and created_at_to parameters.
 * Verify that only snapshots created within the specified date range are returned in results.
 * Test edge case where date range yields no matching snapshots (empty results with proper pagination metadata).
 * Validate that inclusive date boundaries correctly capture snapshots at exact timestamps.
 * Confirm the filtering works correctly with pagination parameters for large snapshot histories spanning multiple date ranges.
 */
export async function test_api_product_snapshot_admin_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection for accessing snapshot endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Setup seller connection for creating product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create category (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create product (automatically creates initial snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // Record the creation time for date range calculations
  const productCreatedAt = new Date(product.createdAt);
  const oneDayInMs = 24 * 60 * 60 * 1000;
  // 5. Test date range filtering - range that includes the snapshot
  const fromDate = new Date(
    productCreatedAt.getTime() - oneDayInMs,
  ).toISOString();
  const toDate = new Date(
    productCreatedAt.getTime() + oneDayInMs,
  ).toISOString();
  const resultWithData =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(resultWithData);
  TestValidator.predicate(
    "date range including snapshot should return at least one result",
    resultWithData.data.length > 0,
  );
  TestValidator.predicate(
    "pagination records should reflect actual count",
    resultWithData.pagination.records > 0,
  );
  // 6. Test date range filtering - future date range (should return empty)
  const farFutureFrom = new Date(
    productCreatedAt.getTime() + 365 * oneDayInMs,
  ).toISOString();
  const farFutureTo = new Date(
    productCreatedAt.getTime() + 366 * oneDayInMs,
  ).toISOString();
  const resultEmpty =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          created_at_from: farFutureFrom,
          created_at_to: farFutureTo,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(resultEmpty);
  TestValidator.equals(
    "future date range should return empty data array",
    resultEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for empty results",
    resultEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for empty results",
    resultEmpty.pagination.pages,
    0,
  );
  // 7. Test date range filtering - past date range (should return empty)
  const farPastFrom = new Date(
    productCreatedAt.getTime() - 366 * oneDayInMs,
  ).toISOString();
  const farPastTo = new Date(
    productCreatedAt.getTime() - 365 * oneDayInMs,
  ).toISOString();
  const resultPastEmpty =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          created_at_from: farPastFrom,
          created_at_to: farPastTo,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(resultPastEmpty);
  TestValidator.equals(
    "past date range should return empty data array",
    resultPastEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for past date range with no matches",
    resultPastEmpty.pagination.records,
    0,
  );
  // 8. Test pagination combined with date filtering
  const resultWithPagination =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(resultWithPagination);
  TestValidator.equals(
    "pagination limit should match request",
    resultWithPagination.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page should match request",
    resultWithPagination.pagination.current,
    1,
  );
  // 9. Test inclusive boundary - exact timestamp of product creation
  const exactFrom = product.createdAt;
  const exactTo = product.createdAt;
  const resultExactBoundary =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          created_at_from: exactFrom,
          created_at_to: exactTo,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(resultExactBoundary);
  TestValidator.predicate(
    "inclusive boundary should include snapshot at exact timestamp",
    resultExactBoundary.data.length > 0,
  );
  // 10. Verify snapshot data structure in filtered results
  if (resultWithData.data.length > 0) {
    const snapshot = resultWithData.data[0];
    TestValidator.predicate(
      "snapshot should have valid id",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should have name",
      typeof snapshot.name === "string",
    );
    TestValidator.predicate(
      "snapshot should have createdAt timestamp",
      typeof snapshot.createdAt === "string",
    );
    TestValidator.predicate(
      "snapshot should have category info",
      snapshot.category !== null && typeof snapshot.category === "object",
    );
    TestValidator.predicate(
      "snapshot should have images array",
      Array.isArray(snapshot.images),
    );
  }
}
