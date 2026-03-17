import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 3: Query all snapshots to establish baseline
  const allSnapshots =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: null,
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Step 4: Test filter with past date (10 years ago) - edge case for empty results
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 10);
  const pastSnapshots =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: null,
          created_at_max: pastDate.toISOString(),
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(pastSnapshots);
  // Verify all returned snapshots are within the date range (createdAt <= max)
  for (const snapshot of pastSnapshots.data) {
    TestValidator.predicate(
      "past filter: snapshot createdAt is before or at max date",
      new Date(snapshot.createdAt) <= pastDate,
    );
  }
  // Step 5: Test filter with future date - should return empty results
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureSnapshots =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: futureDate.toISOString(),
          created_at_max: null,
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(futureSnapshots);
  TestValidator.equals(
    "future date filter returns empty results",
    futureSnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "future date filter total records is 0",
    futureSnapshots.pagination.records,
    0,
  );
  // Step 6: Test narrow time window (recent 1 minute)
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  const narrowWindowSnapshots =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: oneMinuteAgo.toISOString(),
          created_at_max: now.toISOString(),
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(narrowWindowSnapshots);
  // Verify all snapshots in narrow window have createdAt within [min, max]
  for (const snapshot of narrowWindowSnapshots.data) {
    const createdAt = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "narrow window: snapshot createdAt is within date range",
      createdAt >= oneMinuteAgo && createdAt <= now,
    );
  }
  // Step 7: Test wide date range (100 years) - should return all snapshots
  const wideStart = new Date();
  wideStart.setFullYear(wideStart.getFullYear() - 100);
  const wideEnd = new Date();
  wideEnd.setFullYear(wideEnd.getFullYear() + 100);
  const wideRangeSnapshots =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: wideStart.toISOString(),
          created_at_max: wideEnd.toISOString(),
          page: 1,
          limit: 100,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(wideRangeSnapshots);
  // Wide range should return all available snapshots
  TestValidator.predicate(
    "wide range returns all snapshots",
    wideRangeSnapshots.pagination.records >= allSnapshots.pagination.records,
  );
  // Step 8: Test pagination with date filters
  const pageSize = 2;
  const firstPage =
    await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          seller_id: seller.id,
          created_at_min: wideStart.toISOString(),
          created_at_max: wideEnd.toISOString(),
          page: 1,
          limit: pageSize,
          sort: "created_at_desc",
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is respected",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    firstPage.data.length <= pageSize,
  );
  // Test second page if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.ecommerceMall.admin.sellers.profile_snapshots.index(
        adminConnection,
        {
          sellerId: seller.id,
          body: {
            seller_id: seller.id,
            created_at_min: wideStart.toISOString(),
            created_at_max: wideEnd.toISOString(),
            page: 2,
            limit: pageSize,
            sort: "created_at_desc",
          } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page data length does not exceed limit",
      secondPage.data.length <= pageSize,
    );
    // Verify no duplicate IDs across pages
    const firstPageIds = new Set(firstPage.data.map((s) => s.id));
    const secondPageIds = new Set(secondPage.data.map((s) => s.id));
    const intersection = [...firstPageIds].filter((id) =>
      secondPageIds.has(id),
    );
    TestValidator.equals(
      "no duplicate snapshots across pages",
      intersection.length,
      0,
    );
    // Verify total records reflects filtered count
    TestValidator.equals(
      "pagination total records matches filtered count",
      firstPage.pagination.records,
      secondPage.pagination.records,
    );
  }
  // Step 9: Verify filtered counts are consistent
  TestValidator.predicate(
    "narrow window count <= wide range count",
    narrowWindowSnapshots.pagination.records <=
      wideRangeSnapshots.pagination.records,
  );
}
