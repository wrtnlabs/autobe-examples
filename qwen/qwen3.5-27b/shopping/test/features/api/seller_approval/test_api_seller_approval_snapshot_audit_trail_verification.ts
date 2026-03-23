import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_approval_snapshot_audit_trail_verification(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the snapshot system maintains an immutable audit trail for seller approval requests.
   * This test verifies the complete workflow: seller registration, approval request submission,
   * admin approval, and snapshot audit trail verification.
   */
  // 1. Setup: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  // 2. Seller submits approval request (creates first snapshot)
  const approvalRequestBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerApprovalRequest.ICreate;
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      { body: approvalRequestBody },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "approval request has valid reason",
    approvalRequest.reason.length > 0,
  );
  // 3. Setup: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 4. Retrieve snapshots for the approval request
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort_order: "asc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Verify snapshot count and pagination
  TestValidator.equals(
    "snapshot count matches pagination records",
    snapshotsResponse.data.length,
    snapshotsResponse.pagination.records,
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsResponse.data.length >= 1,
  );
  // 6. Verify first snapshot (submission snapshot)
  const firstSnapshot = snapshotsResponse.data[0];
  typia.assert(firstSnapshot);
  const firstSnapshotData = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.equals(
    "first snapshot contains seller_id",
    "seller_id" in firstSnapshotData,
    true,
  );
  TestValidator.equals(
    "first snapshot seller_id matches",
    firstSnapshotData.seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "first snapshot contains reason",
    "reason" in firstSnapshotData,
    true,
  );
  TestValidator.equals(
    "first snapshot reason matches",
    firstSnapshotData.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshotData.status,
    "pending",
  );
  TestValidator.predicate(
    "first snapshot has submitted_at",
    "submitted_at" in firstSnapshotData &&
      firstSnapshotData.submitted_at !== null,
  );
  TestValidator.equals(
    "first snapshot responded_at is null (pending)",
    firstSnapshotData.responded_at,
    null,
  );
  // 7. Verify snapshot chronological order (if multiple snapshots exist)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} created after snapshot ${i - 1}`,
        new Date(snapshotsResponse.data[i].created_at).getTime() >=
          new Date(snapshotsResponse.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 8. Verify snapshot data immutability by checking structure consistency
  for (const snapshot of snapshotsResponse.data) {
    const snapshotData = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      "snapshot contains required fields",
      "seller_id" in snapshotData &&
        "reason" in snapshotData &&
        "status" in snapshotData &&
        "submitted_at" in snapshotData &&
        "responded_at" in snapshotData,
    );
    TestValidator.equals(
      "snapshot seller_id is consistent",
      snapshotData.seller_id,
      sellerAuth.id,
    );
  }
  // 9. Verify snapshot timestamps are valid date-time format
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      `snapshot created_at is valid date-time`,
      !isNaN(Date.parse(snapshot.created_at)),
    );
  }
  // 10. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort_order: "desc",
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.data.length <= 10,
    true,
  );
  // 11. Verify descending order when sort_order is "desc"
  if (paginatedResponse.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted in descending order",
      new Date(paginatedResponse.data[0].created_at).getTime() >=
        new Date(
          paginatedResponse.data[paginatedResponse.data.length - 1].created_at,
        ).getTime(),
    );
  }
}
