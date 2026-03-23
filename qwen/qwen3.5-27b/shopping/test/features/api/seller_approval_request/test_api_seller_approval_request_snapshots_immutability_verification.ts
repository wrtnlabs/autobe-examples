import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test seller approval request snapshots immutability verification.
 * Validates that audit snapshots for seller approval requests maintain data integrity
 * and cannot be modified after creation, ensuring compliance with audit trail requirements.
 */
export async function test_api_seller_approval_request_snapshots_immutability_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create seller approval request
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
  // 3. Retrieve snapshots for the approval request
  const snapshots =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort_order: "desc",
        },
      },
    );
  typia.assert(snapshots);
  // 4. Validate snapshots exist
  TestValidator.predicate(
    "snapshots exist for approval request",
    snapshots.data.length > 0,
  );
  // 5. Get the first snapshot (most recent)
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  // 6. Parse snapshot_data JSON to verify structure
  const snapshotData = JSON.parse(firstSnapshot.snapshot_data);
  // 7. Validate snapshot contains all required fields
  TestValidator.predicate(
    "snapshot contains seller_id",
    "seller_id" in snapshotData,
  );
  TestValidator.predicate("snapshot contains reason", "reason" in snapshotData);
  TestValidator.predicate("snapshot contains status", "status" in snapshotData);
  TestValidator.predicate(
    "snapshot contains submitted_at",
    "submitted_at" in snapshotData,
  );
  TestValidator.predicate(
    "snapshot contains responded_at",
    "responded_at" in snapshotData,
  );
  // 8. Validate snapshot data matches approval request state
  TestValidator.equals(
    "snapshot seller_id matches request seller",
    snapshotData.seller_id,
    approvalRequest.seller.id,
  );
  TestValidator.equals(
    "snapshot reason matches request reason",
    snapshotData.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "snapshot status matches request status",
    snapshotData.status,
    approvalRequest.status,
  );
  TestValidator.equals(
    "snapshot submitted_at matches request submitted_at",
    snapshotData.submitted_at,
    approvalRequest.submitted_at,
  );
  // 9. Validate created_at timestamp is preserved
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    typeof firstSnapshot.created_at === "string" &&
      firstSnapshot.created_at.length > 0,
  );
  // 10. Retrieve snapshots again to verify immutability (multiple reads return identical data)
  const snapshotsSecondRead =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort_order: "desc",
        },
      },
    );
  typia.assert(snapshotsSecondRead);
  // 11. Verify second read returns same data (immutability check)
  TestValidator.equals(
    "snapshot count remains same on second read",
    snapshotsSecondRead.data.length,
    snapshots.data.length,
  );
  if (snapshots.data.length > 0 && snapshotsSecondRead.data.length > 0) {
    TestValidator.equals(
      "first snapshot id unchanged on second read",
      snapshotsSecondRead.data[0].id,
      snapshots.data[0].id,
    );
    TestValidator.equals(
      "first snapshot data unchanged on second read",
      snapshotsSecondRead.data[0].snapshot_data,
      snapshots.data[0].snapshot_data,
    );
    TestValidator.equals(
      "first snapshot created_at unchanged on second read",
      snapshotsSecondRead.data[0].created_at,
      snapshots.data[0].created_at,
    );
  }
}
