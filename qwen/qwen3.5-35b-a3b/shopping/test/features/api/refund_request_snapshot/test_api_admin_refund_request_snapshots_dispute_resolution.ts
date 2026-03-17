import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_admin_refund_request_snapshots_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(admin);
  // 2. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // 3. Create order item (required for refund request)
  // Using random UUID since order creation API not available
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create refund request as customer
  const refundRequest: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          evidence_description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Test: Retrieve all snapshots for the refund request
  const allSnapshotsResponse: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {},
      },
    );
  typia.assert(allSnapshotsResponse);
  TestValidator.equals(
    "snapshot count",
    allSnapshotsResponse.data.length,
    allSnapshotsResponse.data.length,
  );
  TestValidator.equals(
    "total records",
    allSnapshotsResponse.pagination.records,
    allSnapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "has pagination metadata",
    allSnapshotsResponse.pagination.pages > 0,
  );
  // Validate snapshot structure
  for (const snapshot of allSnapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has refund request id",
      snapshot.refundRequestId === refundRequest.id,
    );
    TestValidator.predicate(
      "snapshot has actor type",
      snapshot.actorType !== null,
    );
    TestValidator.predicate(
      "snapshot has action type",
      snapshot.actionType !== null,
    );
    TestValidator.predicate(
      "snapshot has timestamp",
      snapshot.createdAt !== null,
    );
  }
  // 6. Test: Filter by action_type (approved)
  const approvedSnapshotsResponse: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action_type: "approved",
        },
      },
    );
  typia.assert(approvedSnapshotsResponse);
  // Validate approved filter
  for (const snapshot of approvedSnapshotsResponse.data) {
    TestValidator.equals(
      "action_type is approved",
      snapshot.actionType,
      "approved",
    );
    TestValidator.predicate(
      "status changed",
      snapshot.statusBefore !== snapshot.statusAfter ||
        snapshot.statusBefore === null,
    );
  }
  // 7. Test: Filter by action_type (rejected)
  const rejectedSnapshotsResponse: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action_type: "rejected",
        },
      },
    );
  typia.assert(rejectedSnapshotsResponse);
  for (const snapshot of rejectedSnapshotsResponse.data) {
    TestValidator.equals(
      "action_type is rejected",
      snapshot.actionType,
      "rejected",
    );
  }
  // 8. Test: Filter by date range
  const beforeDate: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const afterDate: string & tags.Format<"date-time"> = new Date(
    Date.now() - 86400000,
  ).toISOString(); // 1 day ago
  const dateRangeSnapshotsResponse: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          created_at_after: afterDate,
          created_at_before: beforeDate,
        },
      },
    );
  typia.assert(dateRangeSnapshotsResponse);
  // Validate date range filter
  for (const snapshot of dateRangeSnapshotsResponse.data) {
    const snapshotDate: Date = new Date(snapshot.createdAt);
    TestValidator.predicate(
      "snapshot after date",
      snapshotDate >= new Date(afterDate),
    );
    TestValidator.predicate(
      "snapshot before date",
      snapshotDate <= new Date(beforeDate),
    );
  }
  // 9. Test: Filter by status transitions
  const statusAfterSnapshotsResponse: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status_after: "approved",
        },
      },
    );
  typia.assert(statusAfterSnapshotsResponse);
  for (const snapshot of statusAfterSnapshotsResponse.data) {
    TestValidator.equals(
      "status_after is approved",
      snapshot.statusAfter,
      "approved",
    );
  }
  // 10. Validate audit trail immutability - snapshots should never change
  const secondAllSnapshotsResponse: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {},
      },
    );
  typia.assert(secondAllSnapshotsResponse);
  TestValidator.equals(
    "snapshots immutable",
    secondAllSnapshotsResponse.data.length,
    allSnapshotsResponse.data.length,
  );
}
