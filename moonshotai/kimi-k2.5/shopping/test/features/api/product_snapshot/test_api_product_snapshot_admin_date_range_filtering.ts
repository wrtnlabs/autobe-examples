import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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

export async function test_api_product_snapshot_admin_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Setup: Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Setup: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Setup: Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Note: Simulated environment may auto-generate initial snapshot on product creation.
  // The SDK creates product → first snapshot captured automatically.
  // 5. Query all snapshots to establish baseline
  const allSnapshots =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          limit: 100,
          cursor: null,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate at least one snapshot exists (the creation snapshot)
  TestValidator.predicate(
    "at least one snapshot exists",
    allSnapshots.data.length >= 1,
  );
  // 6. Test: Specific date range filtering
  const snapshotDates = allSnapshots.data.map((s) => new Date(s.createdAt));
  const minDate = new Date(Math.min(...snapshotDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...snapshotDates.map((d) => d.getTime())));
  // Create a range that should include only the earliest snapshot
  const rangeStart = new Date(minDate.getTime() - 86400000); // one day before
  const rangeEnd = new Date(minDate.getTime() + 60000); // one minute after
  const filteredByRange =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: rangeStart.toISOString(),
          createdAtTo: rangeEnd.toISOString(),
          sort: "created_at_ASC" as const,
          limit: 100,
          cursor: null,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRange);
  // Validate filtered results are within range
  TestValidator.predicate(
    "filtered results within date range",
    filteredByRange.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.createdAt);
      return (
        snapshotDate.getTime() >= rangeStart.getTime() &&
        snapshotDate.getTime() <= rangeEnd.getTime()
      );
    }),
  );
  // Validate pagination metadata reflects filtered count
  TestValidator.predicate(
    "pagination records <= baseline count",
    filteredByRange.pagination.records <= allSnapshots.pagination.records,
  );
  // 7. Test: Exact boundary timestamps (inclusive check)
  if (allSnapshots.data.length > 0) {
    const firstSnapshot = allSnapshots.data[0];
    const exactStart = firstSnapshot.createdAt;
    const exactEnd = firstSnapshot.createdAt;
    const boundaryQuery =
      await api.functional.ecommerceMall.admin.products.snapshots.index(
        adminConnection,
        {
          productId: product.id,
          body: {
            createdAtFrom: exactStart,
            createdAtTo: exactEnd,
            sort: null,
            limit: 100,
            cursor: null,
          } satisfies IEcommerceMallProductSnapshot.IRequest,
        },
      );
    typia.assert(boundaryQuery);
    // Should include the snapshot at exact boundary (inclusive)
    TestValidator.predicate(
      "exact boundary includes matching snapshot",
      boundaryQuery.data.some((s) => s.id === firstSnapshot.id),
    );
  }
  // 8. Test: Empty date range (returns no results)
  const futureDate = new Date(maxDate.getTime() + 86400000 * 365); // one year in future
  const emptyRangeQuery =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: futureDate.toISOString(),
          createdAtTo: new Date(futureDate.getTime() + 60000).toISOString(),
          sort: null,
          limit: 100,
          cursor: null,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyRangeQuery);
  TestValidator.equals(
    "empty date range returns no results",
    emptyRangeQuery.data.length,
    0,
  );
  TestValidator.equals(
    "empty date range has zero records in pagination",
    emptyRangeQuery.pagination.records,
    0,
  );
  // 9. Test: Future date range (returns no results)
  const farFutureDate = new Date(futureDate.getTime() + 86400000 * 365 * 10); // 10 years future
  const futureRangeQuery =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: farFutureDate.toISOString(),
          createdAtTo: new Date(
            farFutureDate.getTime() + 86400000,
          ).toISOString(),
          sort: null,
          limit: 100,
          cursor: null,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(futureRangeQuery);
  TestValidator.equals(
    "future date range returns no results",
    futureRangeQuery.data.length,
    0,
  );
  TestValidator.equals(
    "future date range has zero records in pagination",
    futureRangeQuery.pagination.records,
    0,
  );
}
