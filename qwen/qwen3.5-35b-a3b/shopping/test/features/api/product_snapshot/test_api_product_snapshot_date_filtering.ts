import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "SecurePass123!",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup - create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost/seller/join",
      referrer: "http://localhost/",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Create seller connection with token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  // 3. Create a test product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create multiple snapshots at different times by making sequential updates
  const update1 = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(3),
        basePrice: product.base_price + 100,
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(update1);
  const update2 = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(update2);
  const update3 = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        status: "inactive",
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(update3);
  // 5. Get all snapshots to analyze timestamps
  const allSnapshotsResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsResponse);
  TestValidator.equals(
    "Total snapshot count",
    allSnapshotsResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "Total snapshot data length",
    allSnapshotsResponse.data.length,
    3,
  );
  // Extract snapshot timestamps for filtering tests
  const snapshots = allSnapshotsResponse.data;
  const snapshotDates = snapshots.map((s) => new Date(s.created_at));
  // Test 1: Filter by dateRangeStart (returns snapshots >= specified date)
  const midDate = snapshotDates[snapshotDates.length / 2 - 0.5];
  const dateRangeStart = midDate.toISOString();
  const filteredByStartResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
          dateRangeStart,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredByStartResponse);
  TestValidator.equals(
    "Filtered by dateRangeStart count",
    filteredByStartResponse.pagination.records,
    1,
  );
  TestValidator.predicate("filtered by start - all >= dateRangeStart", () =>
    filteredByStartResponse.data.every(
      (s) => new Date(s.created_at) >= midDate,
    ),
  );
  // Test 2: Filter by dateRangeEnd (returns snapshots <= specified date)
  const dateRangeEnd = midDate.toISOString();
  const filteredByEndResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
          dateRangeEnd,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredByEndResponse);
  TestValidator.equals(
    "Filtered by dateRangeEnd count",
    filteredByEndResponse.pagination.records,
    1,
  );
  TestValidator.predicate("filtered by end - all <= dateRangeEnd", () =>
    filteredByEndResponse.data.every((s) => new Date(s.created_at) <= midDate),
  );
  // Test 3: Combined dateRangeStart and dateRangeEnd (returns snapshots within window)
  const earliestDate = snapshotDates[0];
  const latestDate = snapshotDates[snapshotDates.length - 1];
  const middleDate = snapshotDates[1];
  const filteredByBothResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
          dateRangeStart: earliestDate.toISOString(),
          dateRangeEnd: middleDate.toISOString(),
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredByBothResponse);
  TestValidator.equals(
    "Filtered by both dates count",
    filteredByBothResponse.pagination.records,
    2,
  );
  TestValidator.predicate("filtered by both - all within range", () =>
    filteredByBothResponse.data.every((s) => {
      const date = new Date(s.created_at);
      return date >= earliestDate && date <= middleDate;
    }),
  );
  // Test 4: Empty result set when no snapshots match date range
  const farFutureDate = new Date(
    latestDate.getTime() + 1000 * 60 * 60 * 24 * 365,
  ); // 1 year in future
  const emptyFilterResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
          dateRangeStart: farFutureDate.toISOString(),
          dateRangeEnd: farFutureDate.toISOString(),
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "Empty result set count",
    emptyFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty result set data length",
    emptyFilterResponse.data.length,
    0,
  );
  // Test 5: Pagination metadata correctly reflects filtered result count
  const pageSize = 1;
  const page1Response =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: pageSize,
          page: 1,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "Page 1 records count",
    page1Response.pagination.records,
    3,
  );
  TestValidator.equals(
    "Page 1 limit",
    page1Response.pagination.limit,
    pageSize,
  );
  TestValidator.equals("Page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("Page 1 data length", page1Response.data.length, 1);
  const page2Response =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: pageSize,
          page: 2,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "Page 2 records count",
    page2Response.pagination.records,
    3,
  );
  TestValidator.equals("Page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("Page 2 data length", page2Response.data.length, 1);
  // Test 6: Sorting by created_at works correctly with date filters
  const sortedAscResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscResponse);
  const sortedAscDates = sortedAscResponse.data.map(
    (s) => new Date(s.created_at),
  );
  TestValidator.predicate("sorted asc - dates in ascending order", () => {
    for (let i = 1; i < sortedAscDates.length; i++) {
      if (sortedAscDates[i] < sortedAscDates[i - 1]) return false;
    }
    return true;
  });
  const sortedDescResponse =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          limit: 100,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescResponse);
  const sortedDescDates = sortedDescResponse.data.map(
    (s) => new Date(s.created_at),
  );
  TestValidator.predicate("sorted desc - dates in descending order", () => {
    for (let i = 1; i < sortedDescDates.length; i++) {
      if (sortedDescDates[i] > sortedDescDates[i - 1]) return false;
    }
    return true;
  });
}
