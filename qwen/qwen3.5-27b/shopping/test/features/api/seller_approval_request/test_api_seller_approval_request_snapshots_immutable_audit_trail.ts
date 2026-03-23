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

/**
 * Test that snapshots serve as immutable audit trail for dispute resolution and compliance.
 *
 * This test verifies that seller approval request snapshots:
 * 1. Preserve the exact state at capture time (submission)
 * 2. Create a chronological audit trail
 * 3. Contain all necessary fields for traceability (seller_id, reason, status, timestamps)
 * 4. Remain immutable after creation
 * 5. Support dispute resolution by providing historical evidence
 */
export async function test_api_seller_approval_request_snapshots_immutable_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin_audit@test.com",
      password: "Admin123!",
      href: "https://mall.com/admin/register",
      referrer: "https://mall.com/admin",
    },
  });
  // 2. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller_audit@test.com",
      password: "Seller123!",
      shop_name: "Audit Test Shop",
      shop_description: "Testing snapshot immutability",
      href: "https://mall.com/seller/register",
      referrer: "https://mall.com/seller",
    },
  });
  typia.assert(sellerAuth);
  // 3. Setup: Seller submits first approval request with original reason
  const firstReason =
    "I want to sell handmade crafts on your platform to reach more customers.";
  const firstRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: firstReason,
        },
      },
    );
  typia.assert(firstRequest);
  const firstRequestId = firstRequest.id;
  // 4. Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Setup: Seller submits second approval request with updated reason
  const secondReason =
    "I have updated my business plan and now offer premium handmade crafts with quality guarantee.";
  const secondRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: secondReason,
        },
      },
    );
  typia.assert(secondRequest);
  const secondRequestId = secondRequest.id;
  // 6. Admin retrieves snapshots for the first request
  const firstRequestSnapshots =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: firstRequestId,
        body: {
          page: 1,
          limit: 10,
          sort_order: "asc",
        },
      },
    );
  typia.assert(firstRequestSnapshots);
  // 7. Verify first request has at least 1 snapshot (submission)
  TestValidator.predicate(
    "first request has at least one snapshot",
    firstRequestSnapshots.data.length >= 1,
  );
  // 8. Verify snapshot shows original reason and status='pending'
  const firstSnapshot = firstRequestSnapshots.data[0];
  const firstSnapshotData = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.equals(
    "first snapshot reason matches original",
    firstSnapshotData.reason,
    firstReason,
  );
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshotData.status,
    "pending",
  );
  TestValidator.predicate(
    "first snapshot has seller_id",
    firstSnapshotData.seller_id !== undefined &&
      firstSnapshotData.seller_id !== null,
  );
  TestValidator.equals(
    "first snapshot seller_id matches",
    firstSnapshotData.seller_id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "first snapshot has submitted_at timestamp",
    firstSnapshotData.submitted_at !== undefined &&
      firstSnapshotData.submitted_at !== null,
  );
  TestValidator.equals(
    "first snapshot responded_at is null",
    firstSnapshotData.responded_at,
    null,
  );
  // 9. Admin retrieves snapshots for the second request
  const secondRequestSnapshots =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: secondRequestId,
        body: {
          page: 1,
          limit: 10,
          sort_order: "asc",
        },
      },
    );
  typia.assert(secondRequestSnapshots);
  // 10. Verify second request has at least 1 snapshot
  TestValidator.predicate(
    "second request has at least one snapshot",
    secondRequestSnapshots.data.length >= 1,
  );
  // 11. Verify snapshot shows updated reason and status='pending'
  const secondSnapshot = secondRequestSnapshots.data[0];
  const secondSnapshotData = JSON.parse(secondSnapshot.snapshot_data);
  TestValidator.equals(
    "second snapshot reason matches updated",
    secondSnapshotData.reason,
    secondReason,
  );
  TestValidator.equals(
    "second snapshot status is pending",
    secondSnapshotData.status,
    "pending",
  );
  TestValidator.equals(
    "second snapshot seller_id matches",
    secondSnapshotData.seller_id,
    sellerAuth.id,
  );
  // 12. Verify chronological order: second snapshot is after first
  TestValidator.predicate(
    "second request snapshot is after first request snapshot",
    new Date(secondSnapshot.created_at).getTime() >=
      new Date(firstSnapshot.created_at).getTime(),
  );
  // 13. Verify snapshot_data is immutable JSON string
  TestValidator.equals(
    "snapshot_data is valid JSON string",
    typeof firstSnapshot.snapshot_data,
    "string",
  );
  TestValidator.predicate("snapshot_data can be parsed as JSON", () => {
    try {
      JSON.parse(firstSnapshot.snapshot_data);
      return true;
    } catch {
      return false;
    }
  });
  // 14. Verify complete audit trail: all required fields present in each snapshot
  const requiredFields = [
    "seller_id",
    "reason",
    "status",
    "submitted_at",
    "responded_at",
  ];
  for (const snapshot of firstRequestSnapshots.data) {
    const data = JSON.parse(snapshot.snapshot_data);
    for (const field of requiredFields) {
      TestValidator.predicate(
        `snapshot ${snapshot.id} has field ${field}`,
        data[field] !== undefined,
      );
    }
  }
  // 15. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    firstRequestSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    firstRequestSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    firstRequestSnapshots.pagination.records ===
      firstRequestSnapshots.data.length,
  );
  // 16. Verify snapshot immutability: same snapshot data remains unchanged on re-fetch
  const firstRequestSnapshotsRetry =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: firstRequestId,
        body: {
          page: 1,
          limit: 10,
          sort_order: "asc",
        },
      },
    );
  typia.assert(firstRequestSnapshotsRetry);
  TestValidator.equals(
    "snapshot data remains immutable on re-fetch",
    firstRequestSnapshotsRetry.data[0].snapshot_data,
    firstSnapshot.snapshot_data,
  );
  TestValidator.equals(
    "snapshot created_at remains immutable on re-fetch",
    firstRequestSnapshotsRetry.data[0].created_at,
    firstSnapshot.created_at,
  );
}
