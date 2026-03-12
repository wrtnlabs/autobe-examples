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
 * Test that an authenticated administrator can retrieve audit snapshots for a seller approval request.
 *
 * This test verifies:
 * 1. Admin authentication is required and validated
 * 2. Snapshots are returned in paginated format with proper metadata
 * 3. Each snapshot contains the complete JSON state of the approval request
 * 4. Snapshot data includes seller_id, reason, status, submitted_at, and responded_at fields
 * 5. Pagination works correctly with page and limit parameters
 */
export async function test_api_seller_approval_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Seller authentication (required to create approval request)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: RandomGenerator.name(2),
    },
  });
  // 3. Create a seller approval request (this creates the first snapshot)
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: "I want to sell handmade crafts on your platform",
        },
      },
    );
  typia.assert(approvalRequest);
  // 4. Retrieve snapshots for the approval request as admin
  const snapshotsPage =
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
  typia.assert(snapshotsPage);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", snapshotsPage.pagination.limit, 10);
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    snapshotsPage.pagination.pages >= 1,
  );
  // 6. Validate snapshot data
  TestValidator.predicate(
    "snapshots array is not empty",
    snapshotsPage.data.length >= 1,
  );
  // 7. Validate first snapshot structure
  const firstSnapshot = snapshotsPage.data[0];
  typia.assert(firstSnapshot);
  // 8. Validate snapshot_data contains expected fields
  const snapshotData = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.predicate(
    "snapshot_data contains seller_id",
    "seller_id" in snapshotData,
  );
  TestValidator.predicate(
    "snapshot_data contains reason",
    "reason" in snapshotData,
  );
  TestValidator.predicate(
    "snapshot_data contains status",
    "status" in snapshotData,
  );
  TestValidator.predicate(
    "snapshot_data contains submitted_at",
    "submitted_at" in snapshotData,
  );
  TestValidator.predicate(
    "snapshot_data contains responded_at",
    "responded_at" in snapshotData,
  );
  // 9. Validate snapshot data matches original request
  TestValidator.equals(
    "snapshot seller_id matches request",
    snapshotData.seller_id,
    approvalRequest.seller.id,
  );
  TestValidator.equals(
    "snapshot reason matches request",
    snapshotData.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "snapshot status matches request",
    snapshotData.status,
    approvalRequest.status,
  );
  TestValidator.equals(
    "snapshot submitted_at matches request",
    snapshotData.submitted_at,
    approvalRequest.submitted_at,
  );
}
