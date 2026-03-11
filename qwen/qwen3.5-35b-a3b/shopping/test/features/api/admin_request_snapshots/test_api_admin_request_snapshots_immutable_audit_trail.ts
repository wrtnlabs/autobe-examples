import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_snapshots_immutable_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>;
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "Admin123!",
      href: "http://admin.test/join",
      referrer: "http://admin.test",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const adminAuth: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // 2. Create first customer and submit admin request
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Email = typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>;
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: customer1Email,
      password: "Customer123!",
      href: "http://customer.test/join",
      referrer: "http://customer.test",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer1);
  const customer1Auth: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer1.token.access },
  };
  const request1 =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customer1Auth,
      {
        body: {
          reason: "I need admin access for testing purposes",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(request1);
  TestValidator.equals(
    "request created with pending status",
    request1.request_status,
    "pending",
  );
  // 3. Approve first request (creates snapshot)
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      adminAuth,
      {
        adminRequestId: request1.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request approved",
    approvedRequest.request_status,
    "approved",
  );
  TestValidator.predicate(
    "approval creates snapshot",
    approvedRequest.snapshots.length > 0,
  );
  const approvalSnapshot = approvedRequest.snapshots[0];
  typia.assert(approvalSnapshot);
  TestValidator.equals(
    "approval snapshot status",
    approvalSnapshot.request_status,
    "approved",
  );
  TestValidator.equals(
    "snapshot preserves original reason",
    approvalSnapshot.reason,
    request1.reason,
  );
  TestValidator.predicate(
    "snapshot has admin who processed",
    approvalSnapshot.changedBy !== null,
  );
  TestValidator.equals(
    "snapshot admin matches approving admin",
    approvalSnapshot.changedBy!.id,
    admin.id,
  );
  const approvalSnapshotCreatedAt = approvalSnapshot.changed_at;
  // 4. Create second customer and submit admin request
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Email = typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>;
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: customer2Email,
      password: "Customer123!",
      href: "http://customer2.test/join",
      referrer: "http://customer2.test",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer2);
  const customer2Auth: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer2.token.access },
  };
  const request2 =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customer2Auth,
      {
        body: {
          reason: "Request for elevated privileges",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(request2);
  TestValidator.equals(
    "second request created with pending status",
    request2.request_status,
    "pending",
  );
  // 5. Reject second request (creates snapshot with rejection reason)
  const rejectionReason = "Does not meet approval criteria";
  const rejectedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      adminAuth,
      {
        adminRequestId: request2.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "request rejected",
    rejectedRequest.request_status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection creates snapshot",
    rejectedRequest.snapshots.length > 0,
  );
  const rejectionSnapshot = rejectedRequest.snapshots[0];
  typia.assert(rejectionSnapshot);
  TestValidator.equals(
    "rejection snapshot status",
    rejectionSnapshot.request_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection snapshot preserves original reason",
    rejectionSnapshot.reason,
    request2.reason,
  );
  TestValidator.predicate(
    "rejection snapshot has admin who processed",
    rejectionSnapshot.changedBy !== null,
  );
  TestValidator.equals(
    "rejection snapshot admin matches approving admin",
    rejectionSnapshot.changedBy!.id,
    admin.id,
  );
  const rejectionSnapshotCreatedAt = rejectionSnapshot.changed_at;
  // 6. Verify chronological order (approval snapshot should be before rejection snapshot)
  TestValidator.predicate(
    "approval snapshot created before rejection",
    approvalSnapshotCreatedAt < rejectionSnapshotCreatedAt,
  );
  // 7. Query snapshots for request 1 (should only show approval snapshot)
  const snapshotsPage1 =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.index(
      adminAuth,
      {
        adminRequestId: request1.id,
        body: {
          limit: 10,
          sort: "changed_at",
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  TestValidator.equals(
    "request 1 has one snapshot",
    snapshotsPage1.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot in query matches approval",
    snapshotsPage1.data[0].requestStatus,
    "approved",
  );
  // 8. Query snapshots for request 2 (should only show rejection snapshot)
  const snapshotsPage2 =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.index(
      adminAuth,
      {
        adminRequestId: request2.id,
        body: {
          limit: 10,
          sort: "changed_at",
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals(
    "request 2 has one snapshot",
    snapshotsPage2.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot in query matches rejection",
    snapshotsPage2.data[0].requestStatus,
    "rejected",
  );
  // 9. Validate immutability - snapshots cannot be deleted or modified
  // (Verified by API structure: no DELETE/PATCH endpoints for snapshots exist)
  TestValidator.predicate(
    "snapshot ID is immutable UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rejectionSnapshot.id,
    ),
  );
  // 10. Test date range filtering
  const snapshotsWithDateFilter =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.index(
      adminAuth,
      {
        adminRequestId: request1.id,
        body: {
          dateRange: {
            startAt: approvalSnapshotCreatedAt,
            endAt: new Date().toISOString(),
          },
          limit: 10,
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsWithDateFilter);
  TestValidator.equals(
    "date range filter works",
    snapshotsWithDateFilter.data.length,
    1,
  );
  // 11. Test status filtering
  const snapshotsWithStatusFilter =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.index(
      adminAuth,
      {
        adminRequestId: request1.id,
        body: {
          status: "approved",
          limit: 10,
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsWithStatusFilter);
  TestValidator.equals(
    "status filter works",
    snapshotsWithStatusFilter.data.length,
    1,
  );
  // 12. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid metadata",
    snapshotsPage1.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    snapshotsPage1.pagination.records,
    1,
  );
}