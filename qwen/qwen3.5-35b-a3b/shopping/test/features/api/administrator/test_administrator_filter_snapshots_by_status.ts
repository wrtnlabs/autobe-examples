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

export async function test_administrator_filter_snapshots_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Test snapshot filtering by status='approved'
  const approvedSnapshots =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate approved snapshots have approver reference
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.predicate(
      "approved snapshot status equals approved",
      () => snapshot.status === "approved",
    );
    TestValidator.predicate(
      "approved snapshot has non-null approver",
      () => snapshot.approvedByAdministrator !== null,
    );
  }
  // 3. Test snapshot filtering by status='rejected'
  const rejectedSnapshots =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate rejected snapshots have no approver reference
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.predicate(
      "rejected snapshot status equals rejected",
      () => snapshot.status === "rejected",
    );
    TestValidator.equals(
      "rejected snapshot has null approver",
      snapshot.approvedByAdministrator,
      null,
    );
  }
  // 4. Test snapshot filtering by status='pending'
  const pendingSnapshots =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // Validate pending snapshots have no approver reference
  for (const snapshot of pendingSnapshots.data) {
    TestValidator.predicate(
      "pending snapshot status equals pending",
      () => snapshot.status === "pending",
    );
    TestValidator.equals(
      "pending snapshot has null approver",
      snapshot.approvedByAdministrator,
      null,
    );
  }
  // 5. Test pagination
  const paginationSnapshots =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginationSnapshots);
  TestValidator.equals(
    "pagination respects limit",
    paginationSnapshots.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginationSnapshots.pagination.current,
    2,
  );
  TestValidator.predicate(
    "returned data count matches or is less than limit",
    () => paginationSnapshots.data.length <= 5,
  );
}
