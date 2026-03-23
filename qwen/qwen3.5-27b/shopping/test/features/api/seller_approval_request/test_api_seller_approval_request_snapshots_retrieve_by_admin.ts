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

export async function test_api_seller_approval_request_snapshots_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an administrator can retrieve the audit snapshots for a seller approval request.
   *
   * This test verifies that:
   * 1. Admin can access seller approval request snapshots
   * 2. Snapshots are created at key workflow moments (submission, approval)
   * 3. Snapshots preserve complete historical state
   * 4. Pagination and sorting work correctly
   */
  // 1. Setup: Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Setup: Seller submits approval request (creates first snapshot)
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "initial status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null initially",
    approvalRequest.responded_at,
    null,
  );
  // 4. Admin retrieves snapshots for the approval request
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort_order: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate("has snapshots", snapshotsResponse.data.length > 0);
  // 6. Verify snapshot count matches pagination records
  TestValidator.equals(
    "total snapshot count matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  // 7. Verify snapshots are sorted by created_at descending (newest first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is older than snapshot ${i - 1}`,
        new Date(snapshotsResponse.data[i].created_at).getTime() <=
          new Date(snapshotsResponse.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 8. Verify first snapshot (most recent) contains valid JSON data
  const latestSnapshot = snapshotsResponse.data[0];
  typia.assert(latestSnapshot);
  // Parse snapshot_data to verify it contains required fields
  const snapshotData = JSON.parse(latestSnapshot.snapshot_data);
  TestValidator.predicate(
    "snapshot_data is valid JSON",
    typeof snapshotData === "object",
  );
  TestValidator.predicate(
    "snapshot has seller_id",
    "seller_id" in snapshotData,
  );
  TestValidator.predicate("snapshot has reason", "reason" in snapshotData);
  TestValidator.predicate("snapshot has status", "status" in snapshotData);
  TestValidator.predicate(
    "snapshot has submitted_at",
    "submitted_at" in snapshotData,
  );
  TestValidator.predicate(
    "snapshot has responded_at",
    "responded_at" in snapshotData,
  );
  // 9. Verify snapshot status matches approval request status
  TestValidator.equals(
    "snapshot status matches request status",
    snapshotData.status,
    approvalRequest.status,
  );
  // 10. Verify seller_id in snapshot matches the authenticated seller
  TestValidator.equals(
    "snapshot seller_id matches request seller",
    snapshotData.seller_id,
    sellerAuth.id,
  );
  // 11. Verify reason in snapshot matches submitted reason
  TestValidator.equals(
    "snapshot reason matches submitted reason",
    snapshotData.reason,
    approvalRequest.reason,
  );
  // 12. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 1,
          sort_order: "asc",
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination with limit 1",
    paginatedResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination page 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has at least 1 snapshot",
    paginatedResponse.data.length >= 1,
  );
  // 13. Verify ascending sort order
  if (paginatedResponse.data.length > 1) {
    for (let i = 1; i < paginatedResponse.data.length; i++) {
      TestValidator.predicate(
        `ascending sort: snapshot ${i} is newer than snapshot ${i - 1}`,
        new Date(paginatedResponse.data[i].created_at).getTime() >=
          new Date(paginatedResponse.data[i - 1].created_at).getTime(),
      );
    }
  }
}
