import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshots_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  let product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Make multiple edits at different times to create snapshots
  const now = new Date();
  const initialSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: { limit: 100 },
      },
    );
  typia.assert(initialSnapshots);
  const initialCount = initialSnapshots.data.length;
  const editCount = 5;
  let currentBasePrice = product.base_price;
  // Make edits at different times with 2-second delays to ensure different timestamps
  for (let i = 1; i <= editCount; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: `${RandomGenerator.paragraph({ sentences: 3 })} - Edit ${i}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: currentBasePrice + i * 100,
          category_id: category.id,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
    // Calculate next base_price for next iteration
    currentBasePrice = currentBasePrice + i * 100;
  }
  // 4. Date range filtering - test filtering within specific time window
  const lastSnapshots =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: { limit: 100 },
      },
    );
  typia.assert(lastSnapshots);
  const testStartTime = new Date(now.getTime() + 2000); // Start after first edit
  const testEndTime = new Date(now.getTime() + 12000); // End before last edit
  const filteredPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          start_date: testStartTime.toISOString(),
          end_date: testEndTime.toISOString(),
          limit: 20,
          sort_by: "created_at",
          sort_direction: "DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredPage);
  typia.assert(filteredPage.data);
  // Verify all returned snapshots are within date range
  for (const snapshot of filteredPage.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at within range`,
      snapshotDate >= testStartTime && snapshotDate <= testEndTime,
    );
  }
  // Verify filtering excludes snapshots outside range
  if (filteredPage.data.length > 0) {
    TestValidator.predicate(
      "filter returns snapshots only within date range",
      filteredPage.data.every((s) => {
        const sDate = new Date(s.created_at);
        return sDate >= testStartTime && sDate <= testEndTime;
      }),
    );
  }
  // 5. Sort direction validation - ASC (oldest first)
  const sortedAscPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 20,
          sort_by: "created_at",
          sort_direction: "ASC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscPage);
  if (sortedAscPage.data.length > 1) {
    for (let i = 1; i < sortedAscPage.data.length; i++) {
      const prevTime = new Date(sortedAscPage.data[i - 1].created_at);
      const currTime = new Date(sortedAscPage.data[i].created_at);
      TestValidator.predicate(
        `sort ASC: snapshot ${i} is after snapshot ${i - 1}`,
        prevTime <= currTime,
      );
    }
  }
  // 6. Sort direction validation - DESC (newest first)
  const sortedDescPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 20,
          sort_by: "created_at",
          sort_direction: "DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescPage);
  if (sortedDescPage.data.length > 1) {
    for (let i = 1; i < sortedDescPage.data.length; i++) {
      const prevTime = new Date(sortedDescPage.data[i - 1].created_at);
      const currTime = new Date(sortedDescPage.data[i].created_at);
      TestValidator.predicate(
        `sort DESC: snapshot ${i} is before snapshot ${i - 1}`,
        prevTime >= currTime,
      );
    }
  }
  // 7. Sort by entity_status
  const statusSortedPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 20,
          sort_by: "entity_status",
          sort_direction: "ASC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(statusSortedPage);
  if (statusSortedPage.data.length > 1) {
    for (let i = 1; i < statusSortedPage.data.length; i++) {
      const prevStatus = statusSortedPage.data[i - 1].entity_status;
      const currStatus = statusSortedPage.data[i].entity_status;
      TestValidator.predicate(
        `sort by entity_status ASC: status ${i} is >= status ${i - 1}`,
        prevStatus <= currStatus,
      );
    }
  }
  // 8. Cursor-based navigation - get first page
  const firstPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 2,
          sort_by: "created_at",
          sort_direction: "DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  if (firstPage.data.length > 0) {
    const lastSnapshot = firstPage.data[firstPage.data.length - 1];
    const nextCursor = lastSnapshot.created_at;
    // Get second page using cursor
    const secondPage =
      await api.functional.ecommerceMall.seller.products.snapshots.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            limit: 2,
            sort_by: "created_at",
            sort_direction: "DESC",
            cursor: nextCursor,
          } satisfies IEcommerceMallProductSnapshot.IRequest,
        },
      );
    typia.assert(secondPage);
    // Verify cursor-based pagination works correctly
    if (secondPage.data.length > 0) {
      const firstOfSecondPage = secondPage.data[0];
      const lastOfFirstPage = firstPage.data[firstPage.data.length - 1];
      const firstPageTime = new Date(lastOfFirstPage.created_at);
      const secondPageTime = new Date(firstOfSecondPage.created_at);
      TestValidator.predicate(
        `cursor pagination: second page is older than first page`,
        secondPageTime < firstPageTime,
      );
    }
  }
  // 9. Limit parameter - verify custom limit is respected
  const limitPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 3,
          sort_by: "created_at",
          sort_direction: "DESC",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(limitPage);
  TestValidator.predicate(
    "limit parameter respected",
    limitPage.data.length <= 3,
  );
  TestValidator.equals(
    "pagination limit matches request",
    limitPage.pagination.limit,
    3,
  );
  // Verify snapshot structure has all required fields
  if (limitPage.data.length > 0) {
    const sampleSnapshot = limitPage.data[0];
    TestValidator.predicate(
      "snapshot has valid id",
      sampleSnapshot.id !== null && sampleSnapshot.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid name",
      sampleSnapshot.name !== null && sampleSnapshot.name !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid base_price",
      sampleSnapshot.base_price !== null &&
        sampleSnapshot.base_price !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      sampleSnapshot.created_at !== null &&
        sampleSnapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid entity_status",
      sampleSnapshot.entity_status !== null &&
        sampleSnapshot.entity_status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid action",
      sampleSnapshot.action !== null && sampleSnapshot.action !== undefined,
    );
    TestValidator.predicate(
      "snapshot has valid category",
      sampleSnapshot.category !== null && sampleSnapshot.category !== undefined,
    );
    TestValidator.notEquals(
      "category has id",
      sampleSnapshot.category.id,
      null,
    );
  }
}