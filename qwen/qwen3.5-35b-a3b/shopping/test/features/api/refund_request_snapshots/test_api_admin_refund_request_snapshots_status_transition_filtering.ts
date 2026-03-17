import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_admin_refund_request_snapshots_status_transition_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create a refund request to have snapshots
  // (Since we don't have a creation endpoint, we'll test with a random ID that may or may not exist)
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test filtering by status_before: pending
  const pendingSnapshots: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          status_before: "pending",
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // 4. Test filtering by status_after: approved
  const approvedSnapshots: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          status_after: "approved",
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 5. Test filtering by status_after: rejected
  const rejectedSnapshots: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          status_after: "rejected",
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 6. Test filtering by status_before: pending and status_after: approved
  const pendingToApprovedSnapshots: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          status_before: "pending",
          status_after: "approved",
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingToApprovedSnapshots);
  // 7. Test filtering by status_before: pending and status_after: rejected
  const pendingToRejectedSnapshots: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          status_before: "pending",
          status_after: "rejected",
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingToRejectedSnapshots);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pendingSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    pendingSnapshots.pagination.limit >= 1 &&
      pendingSnapshots.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records valid",
    pendingSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    pendingSnapshots.pagination.pages >= 0,
  );
  // 9. Validate snapshot data structure
  for (const snapshot of pendingSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.notEquals("snapshot id exists", snapshot.id, null);
    TestValidator.notEquals(
      "refund request id exists",
      snapshot.refundRequestId,
      null,
    );
    TestValidator.predicate(
      "actor type valid",
      ["customer", "seller", "admin", "super_admin"].includes(
        snapshot.actorType,
      ),
    );
    TestValidator.predicate(
      "action type valid",
      [
        "created",
        "status_changed",
        "approved",
        "rejected",
        "response_added",
      ].includes(snapshot.actionType),
    );
    TestValidator.predicate(
      "status_before valid",
      snapshot.statusBefore === null ||
        ["pending", "approved", "rejected", "refunded"].includes(
          snapshot.statusBefore,
        ),
    );
    TestValidator.predicate(
      "status_after valid",
      snapshot.statusAfter === null ||
        ["pending", "approved", "rejected", "refunded"].includes(
          snapshot.statusAfter,
        ),
    );
    TestValidator.predicate(
      "created_at exists",
      snapshot.createdAt !== undefined && snapshot.createdAt !== null,
    );
  }
  // 10. Validate snapshot data structure for approved snapshots
  for (const snapshot of approvedSnapshots.data) {
    typia.assert(snapshot);
    if (snapshot.statusAfter !== null) {
      TestValidator.equals(
        "approved snapshots status_after",
        snapshot.statusAfter,
        "approved",
      );
    }
  }
  // 11. Validate snapshot data structure for rejected snapshots
  for (const snapshot of rejectedSnapshots.data) {
    typia.assert(snapshot);
    if (snapshot.statusAfter !== null) {
      TestValidator.equals(
        "rejected snapshots status_after",
        snapshot.statusAfter,
        "rejected",
      );
    }
  }
  // 12. Validate combined filter results
  for (const snapshot of pendingToApprovedSnapshots.data) {
    typia.assert(snapshot);
    if (snapshot.statusBefore !== null) {
      TestValidator.equals(
        "combined filter status_before",
        snapshot.statusBefore,
        "pending",
      );
    }
    if (snapshot.statusAfter !== null) {
      TestValidator.equals(
        "combined filter status_after",
        snapshot.statusAfter,
        "approved",
      );
    }
  }
  for (const snapshot of pendingToRejectedSnapshots.data) {
    typia.assert(snapshot);
    if (snapshot.statusBefore !== null) {
      TestValidator.equals(
        "combined filter status_before",
        snapshot.statusBefore,
        "pending",
      );
    }
    if (snapshot.statusAfter !== null) {
      TestValidator.equals(
        "combined filter status_after",
        snapshot.statusAfter,
        "rejected",
      );
    }
  }
}
