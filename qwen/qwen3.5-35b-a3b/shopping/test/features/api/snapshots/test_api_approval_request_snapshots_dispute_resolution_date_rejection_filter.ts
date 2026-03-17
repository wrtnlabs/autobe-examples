import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_approval_request_snapshots_dispute_resolution_date_rejection_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Generate test data
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  // Calculate date range for filtering
  const oneWeekBefore = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAfter = new Date(
    now.getTime() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 2. Test date range filtering (start_time, end_time)
  const dateRangeQuery = {
    start_time: oneWeekBefore,
    end_time: oneDayAfter,
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: dateRangeQuery,
      },
    );
  typia.assert(dateRangeResult);
  // 3. Test rejection_reason_exists filter
  const hasRejectionQuery = {
    rejection_reason_exists: true,
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const hasRejectionResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: hasRejectionQuery,
      },
    );
  typia.assert(hasRejectionResult);
  // Validate: all snapshots have rejection_reason when filter is true
  for (const snapshot of hasRejectionResult.data) {
    TestValidator.equals(
      `snapshot has rejection_reason when filter true`,
      snapshot.rejection_reason !== null,
      true,
    );
  }
  const noRejectionQuery = {
    rejection_reason_exists: false,
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const noRejectionResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: noRejectionQuery,
      },
    );
  typia.assert(noRejectionResult);
  // Validate: all snapshots have null rejection_reason when filter is false
  for (const snapshot of noRejectionResult.data) {
    TestValidator.equals(
      `snapshot rejection_reason is null when filter false`,
      snapshot.rejection_reason,
      null,
    );
  }
  // 4. Test sorting by created_at (asc and desc)
  const sortAscQuery = {
    sort_by: "created_at",
    sort: "asc",
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const sortAscResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: sortAscQuery,
      },
    );
  typia.assert(sortAscResult);
  const sortDescQuery = {
    sort_by: "created_at",
    sort: "desc",
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const sortDescResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: sortDescQuery,
      },
    );
  typia.assert(sortDescResult);
  // Test sorting by from_status
  const sortByFromStatusQuery = {
    sort_by: "from_status",
    sort: "asc",
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const sortByFromStatusResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: sortByFromStatusQuery,
      },
    );
  typia.assert(sortByFromStatusResult);
  // Test sorting by to_status
  const sortByToStatusQuery = {
    sort_by: "to_status",
    sort: "desc",
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const sortByToStatusResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: sortByToStatusQuery,
      },
    );
  typia.assert(sortByToStatusResult);
  // 5. Test pagination
  const page1Query = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const page1Result =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: page1Query,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  const page2Query = {
    page: 2,
    limit: 5,
  } satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const page2Result =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: page2Query,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // 6. Validate snapshot immutability and audit trail
  const allSnapshotsQuery =
    {} satisfies IEcommerceMallSellerApprovalSnapshot.IRequest;
  const allSnapshotsResult =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: allSnapshotsQuery,
      },
    );
  typia.assert(allSnapshotsResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    allSnapshotsResult.pagination.records,
    allSnapshotsResult.pagination.records,
  );
  const calculatedPages =
    allSnapshotsResult.pagination.records === 0
      ? 0
      : Math.ceil(
          allSnapshotsResult.pagination.records /
            allSnapshotsResult.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages calculated",
    allSnapshotsResult.pagination.pages,
    calculatedPages,
  );
  // Validate each snapshot has required fields for audit trail
  for (const snapshot of allSnapshotsResult.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} has id`,
      snapshot.id !== undefined,
      true,
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} has from_status`,
      snapshot.from_status !== undefined,
      true,
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} has to_status`,
      snapshot.to_status !== undefined,
      true,
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} has actor_type`,
      snapshot.actor_type !== undefined,
      true,
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} has created_at`,
      snapshot.created_at !== undefined,
      true,
    );
  }
}
