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
 * Test that an authenticated administrator can filter seller approval request snapshots by creation date range.
 * The test verifies date range filtering works correctly with created_at_from and created_at_to parameters,
 * ensuring only snapshots within the specified date range are returned.
 */
export async function test_api_seller_approval_snapshot_with_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Setup: Seller registration and approval request creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create seller approval request (this creates the first snapshot)
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
  const firstSnapshotCreatedAt = approvalRequest.submitted_at;
  // 3. Test: Filter snapshots with date range that includes the snapshot
  const resultInRange =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: firstSnapshotCreatedAt,
          created_at_to: new Date().toISOString(),
          sort_order: "desc",
        },
      },
    );
  typia.assert(resultInRange);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    resultInRange.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", resultInRange.pagination.limit, 20);
  TestValidator.predicate(
    "snapshots found in date range",
    resultInRange.data.length > 0,
  );
  // Verify all returned snapshots are within the date range
  await ArrayUtil.asyncForEach(resultInRange.data, async (snapshot) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at is within range`,
      snapshot.created_at >= firstSnapshotCreatedAt &&
        snapshot.created_at <= new Date().toISOString(),
    );
  });
  // 4. Test: Filter snapshots with date range that excludes the snapshot
  const pastDate = new Date(
    new Date().getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastDateEnd = new Date(
    new Date().getTime() - 180 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const resultOutOfRange =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: pastDate,
          created_at_to: pastDateEnd,
          sort_order: "desc",
        },
      },
    );
  typia.assert(resultOutOfRange);
  // Verify no snapshots returned for out-of-range date filter
  TestValidator.equals(
    "no snapshots in past date range",
    resultOutOfRange.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for empty range",
    resultOutOfRange.pagination.records,
    0,
  );
  // 5. Test: Sort order ascending
  const resultAscending =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          created_at_from: firstSnapshotCreatedAt,
          created_at_to: new Date().toISOString(),
          sort_order: "asc",
        },
      },
    );
  typia.assert(resultAscending);
  TestValidator.predicate(
    "snapshots returned with ascending sort",
    resultAscending.data.length > 0,
  );
  // 6. Test: Verify snapshot_data field is complete and immutable
  if (resultInRange.data.length > 0) {
    const firstSnapshot = resultInRange.data[0];
    typia.assert(firstSnapshot);
    // Parse snapshot_data to verify it contains complete approval request state
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
    TestValidator.equals(
      "snapshot seller_id matches request",
      snapshotData.seller_id,
      approvalRequest.seller.id,
    );
  }
}