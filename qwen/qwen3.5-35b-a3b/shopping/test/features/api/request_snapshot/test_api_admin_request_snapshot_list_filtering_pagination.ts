import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_snapshot_list_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with token
  const adminTokenConnection: api.IConnection = { host: connection.host };
  adminTokenConnection.headers = {
    ...adminTokenConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Create test data with multiple snapshots of different statuses
  // Since snapshots are created by the system when admin requests are processed,
  // we need to work with existing data or use the index endpoint to verify filtering
  // 3. Test status filtering - requestStatus='approved'
  const approvedFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    requestStatus: "approved",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const approvedResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  // Verify all returned snapshots have status 'approved'
  for (const snapshot of approvedResult.data) {
    TestValidator.equals(
      "all approved results have approved status",
      snapshot.requestStatus,
      "approved",
    );
  }
  // 4. Test status filtering - requestStatus='rejected'
  const rejectedFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    requestStatus: "rejected",
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const rejectedResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  // Verify all returned snapshots have status 'rejected'
  for (const snapshot of rejectedResult.data) {
    TestValidator.equals(
      "all rejected results have rejected status",
      snapshot.requestStatus,
      "rejected",
    );
  }
  // 5. Test date range filtering
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - 30 * oneDay).toISOString();
  const endDate = new Date(now.getTime() - 1 * oneDay).toISOString();
  const dateRangeFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    startDate,
    endDate,
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  // Verify all returned snapshots are within date range
  for (const snapshot of dateRangeResult.data) {
    const snapshotDate = new Date(snapshot.changedAt);
    TestValidator.predicate(
      "snapshot changedAt >= startDate",
      () => snapshotDate >= new Date(startDate),
    );
    TestValidator.predicate(
      "snapshot changedAt <= endDate",
      () => snapshotDate <= new Date(endDate),
    );
  }
  // 6. Test text search on reason - case-insensitive partial match
  const searchText = RandomGenerator.paragraph({ sentences: 2 });
  const textSearchFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    reason: searchText,
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const textSearchResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: textSearchFilter },
    );
  typia.assert(textSearchResult);
  // Verify all returned snapshots have reason containing the search text (case-insensitive)
  for (const snapshot of textSearchResult.data) {
    TestValidator.predicate(
      "reason contains search text (case-insensitive)",
      () => snapshot.reason.toLowerCase().includes(searchText.toLowerCase()),
    );
  }
  // 7. Test pagination
  const page2Filter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    page: 2,
    pageSize: 10,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const page2Result =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: page2Filter },
    );
  typia.assert(page2Result);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    page2Result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    page2Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page2Result.pagination.pages >= 0,
  );
  // 8. Test sorting - sortBy='reason', sortOrder='ASC'
  const sortFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    sortBy: "reason",
    sortOrder: "ASC",
    page: 1,
    pageSize: 10,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const sortResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: sortFilter },
    );
  typia.assert(sortResult);
  // Verify sorting is ascending by reason
  if (sortResult.data.length > 1) {
    for (let i = 1; i < sortResult.data.length; i++) {
      TestValidator.predicate(
        "reason is sorted ascending",
        () => sortResult.data[i - 1].reason <= sortResult.data[i].reason,
      );
    }
  }
  // 9. Test sorting - sortBy='reason', sortOrder='DESC'
  const sortDescFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    sortBy: "reason",
    sortOrder: "DESC",
    page: 1,
    pageSize: 10,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const sortDescResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: sortDescFilter },
    );
  typia.assert(sortDescResult);
  // Verify sorting is descending by reason
  if (sortDescResult.data.length > 1) {
    for (let i = 1; i < sortDescResult.data.length; i++) {
      TestValidator.predicate(
        "reason is sorted descending",
        () =>
          sortDescResult.data[i - 1].reason >= sortDescResult.data[i].reason,
      );
    }
  }
  // 10. Test combined filters with AND logic
  const combinedFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    requestStatus: "approved",
    startDate: startDate,
    endDate: endDate,
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const combinedResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Verify all results match ALL filter criteria (AND logic)
  for (const snapshot of combinedResult.data) {
    TestValidator.equals(
      "combined filter: all results have approved status",
      snapshot.requestStatus,
      "approved",
    );
    const snapshotDate = new Date(snapshot.changedAt);
    TestValidator.predicate(
      "combined filter: snapshot changedAt >= startDate",
      () => snapshotDate >= new Date(startDate),
    );
    TestValidator.predicate(
      "combined filter: snapshot changedAt <= endDate",
      () => snapshotDate <= new Date(endDate),
    );
  }
  // 11. Test empty results scenario
  const noResultsFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    requestStatus: "approved",
    startDate: new Date(now.getTime() + 100 * oneDay).toISOString(), // future date
    endDate: new Date(now.getTime() + 101 * oneDay).toISOString(),
    page: 1,
    pageSize: 20,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const noResultsResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: noResultsFilter },
    );
  typia.assert(noResultsResult);
  // Verify empty results
  TestValidator.equals(
    "empty results: data array is empty",
    noResultsResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty results: records count is 0",
    noResultsResult.pagination.records,
    0,
  );
  // 12. Test maximum pageSize enforcement
  const maxPageSizeFilter: IEcommerceMallAdminRequestSnapshot.IRequest = {
    pageSize: 100,
    page: 1,
  } satisfies IEcommerceMallAdminRequestSnapshot.IRequest;
  const maxPageSizeResult =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminTokenConnection,
      { body: maxPageSizeFilter },
    );
  typia.assert(maxPageSizeResult);
  TestValidator.predicate(
    "max pageSize: actual results <= 100",
    () => maxPageSizeResult.data.length <= 100,
  );
  TestValidator.equals(
    "max pageSize: limit is 100",
    maxPageSizeResult.pagination.limit,
    100,
  );
}
