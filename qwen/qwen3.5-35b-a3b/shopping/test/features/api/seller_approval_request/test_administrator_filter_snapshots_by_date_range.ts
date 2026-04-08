import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_administrator_filter_snapshots_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Define date range parameters
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * oneDay);
  const midPoint = new Date(thirtyDaysAgo.getTime() + 15 * oneDay);
  const futureDate = "9999-12-31T23:59:59.999Z";
  // 3. Test date range filtering with snapshot_time_min and snapshot_time_max
  const filteredSnapshots =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_time_min: thirtyDaysAgo.toISOString(),
          snapshot_time_max: midPoint.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 4. Verify pagination metadata reflects only filtered records
  TestValidator.equals(
    "filtered pagination records matches data count",
    filteredSnapshots.pagination.records,
    filteredSnapshots.data.length,
  );
  // 5. Test approved_at_min/max filters
  const approvalFiltered =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          approved_at_min: new Date(
            thirtyDaysAgo.getTime() + 5 * oneDay,
          ).toISOString(),
          approved_at_max: new Date(
            thirtyDaysAgo.getTime() + 10 * oneDay,
          ).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvalFiltered);
  TestValidator.equals(
    "approved_at filtered pagination records",
    approvalFiltered.pagination.records,
    approvalFiltered.data.length,
  );
  // 6. Test rejected_at_min/max filters
  const rejectionFiltered =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          rejected_at_min: new Date(
            thirtyDaysAgo.getTime() + 12 * oneDay,
          ).toISOString(),
          rejected_at_max: new Date(
            thirtyDaysAgo.getTime() + 18 * oneDay,
          ).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectionFiltered);
  TestValidator.equals(
    "rejected_at filtered pagination records",
    rejectionFiltered.pagination.records,
    rejectionFiltered.data.length,
  );
  // 7. Test combined filters: status + date range
  const combinedFiltered =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          snapshot_time_min: new Date(
            thirtyDaysAgo.getTime() + 15 * oneDay,
          ).toISOString(),
          snapshot_time_max: new Date(
            thirtyDaysAgo.getTime() + 20 * oneDay,
          ).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter pagination records",
    combinedFiltered.pagination.records,
    combinedFiltered.data.length,
  );
  // 8. Test empty result set (far future date)
  const emptyFiltered =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_time_min: futureDate,
          snapshot_time_max: futureDate,
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals(
    "empty result set pagination records",
    emptyFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set data length",
    emptyFiltered.data.length,
    0,
  );
  // 9. Test pagination with different page and limit values
  const paginatedFiltered =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_time_min: thirtyDaysAgo.toISOString(),
          snapshot_time_max: midPoint.toISOString(),
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedFiltered);
  TestValidator.equals(
    "paginated result current page",
    paginatedFiltered.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated result limit",
    paginatedFiltered.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "paginated result data within limit",
    paginatedFiltered.data.length <= 5,
  );
  // 10. Verify boundary conditions - snapshots on min/max dates should be included
  // Query with exact boundary dates
  const boundaryFiltered =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_time_min: thirtyDaysAgo.toISOString(),
          snapshot_time_max: thirtyDaysAgo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(boundaryFiltered);
  TestValidator.equals(
    "boundary condition pagination records",
    boundaryFiltered.pagination.records,
    boundaryFiltered.data.length,
  );
  // 11. Test snapshot immutability - filtering should not modify data
  const firstQuery =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_time_min: thirtyDaysAgo.toISOString(),
          snapshot_time_max: midPoint.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(firstQuery);
  const secondQuery =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_time_min: thirtyDaysAgo.toISOString(),
          snapshot_time_max: midPoint.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(secondQuery);
  TestValidator.equals(
    "snapshot immutability - queries return consistent results",
    firstQuery.pagination.records,
    secondQuery.pagination.records,
  );
}
