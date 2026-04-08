import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a seller
  const sellerAuth = await authorize_seller_join(connection, {});
  // Create seller connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Query snapshots with date range (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fromDate = thirtyDaysAgo.toISOString();
  const toDate = new Date().toISOString();
  const snapshotsWithRange =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          from_date: fromDate,
          to_date: toDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  const snapshotsPage =
    typia.assert<IPageIEcommerceMallSellerProfileSnapshot>(snapshotsWithRange);
  // Validate pagination metadata via correct nested path
  // snapshotsPage.pagination is IPageIEcommerceMall.IPagination
  // snapshotsPage.pagination.pagination is IPage.IPagination (has current, limit, records, pages)
  const paginationMeta = snapshotsPage.pagination.pagination;
  TestValidator.predicate(
    "pagination has current page",
    paginationMeta.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginationMeta.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginationMeta.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginationMeta.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(snapshotsPage.data));
  // 3. Test with date range where no snapshots exist
  const oldFromDate = new Date();
  oldFromDate.setFullYear(oldFromDate.getFullYear() - 10);
  const oldToDate = new Date();
  oldToDate.setFullYear(oldToDate.getFullYear() - 9);
  const emptySnapshots =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          from_date: oldFromDate.toISOString(),
          to_date: oldToDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  const emptyPage =
    typia.assert<IPageIEcommerceMallSellerProfileSnapshot>(emptySnapshots);
  const emptyPaginationMeta = emptyPage.pagination.pagination;
  // Validate empty result
  TestValidator.equals("empty data array", emptyPage.data.length, 0);
  TestValidator.equals("zero records", emptyPaginationMeta.records, 0);
  TestValidator.equals("zero pages", emptyPaginationMeta.pages, 0);
  TestValidator.equals("current page is 1", emptyPaginationMeta.current, 1);
  // 4. Test edge case: from_date after to_date
  const futureFromDate = new Date();
  futureFromDate.setDate(futureFromDate.getDate() + 30);
  const pastToDate = new Date();
  pastToDate.setDate(pastToDate.getDate() - 30);
  // Should return validation error or empty results
  await TestValidator.error("invalid date range (from > to)", async () => {
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          from_date: futureFromDate.toISOString(),
          to_date: pastToDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  });
}
