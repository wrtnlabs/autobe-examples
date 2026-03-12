import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an administrator can access seller approval request snapshots for dispute resolution purposes.
 * Verifies the snapshot contains complete before/after state information as required by business rules.
 *
 * Workflow:
 * 1. Register and authenticate as an administrator
 * 2. Register a seller account and submit a seller approval request
 * 3. Retrieve a snapshot via the target endpoint (assuming snapshot exists from prior approval)
 * 4. Validate the snapshot contains complete state information for audit trail and dispute resolution
 */
export async function test_api_seller_approval_snapshot_admin_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    },
  });
  // Step 2: Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    href: "https://example.com/seller/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  // Step 3: Submit a seller approval request
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
  // Store request ID and reason for validation
  const requestId = approvalRequest.id;
  const submissionReason = approvalRequest.reason;
  // Step 4: Retrieve a snapshot
  // Note: In a real scenario, the snapshot would be created when admin approves/rejects the request
  // For this test, we're testing the snapshot retrieval endpoint with a generated snapshotId
  // The actual snapshot creation happens through the approval workflow (not available in SDK)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.at(
      adminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 5: Validate snapshot contains complete audit trail information
  // Verify snapshotData JSON structure contains all required fields for dispute resolution
  const snapshotData = JSON.parse(snapshot.snapshotData);
  // Validate seller_id matches the approval request's seller
  TestValidator.equals(
    "snapshotData seller_id matches request seller",
    snapshotData.seller_id,
    approvalRequest.seller.id,
  );
  // Validate reason is preserved in snapshot
  TestValidator.equals(
    "snapshotData reason matches original submission",
    snapshotData.reason,
    submissionReason,
  );
  // Validate status is captured (should be 'pending' before approval)
  TestValidator.predicate(
    "snapshotData status is valid approval state",
    ["pending", "approved", "rejected"].includes(snapshotData.status),
  );
  // Validate timestamps are present for audit trail
  TestValidator.predicate(
    "snapshotData has submitted_at timestamp",
    snapshotData.submitted_at !== null &&
      snapshotData.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "snapshotData has responded_at field (may be null if pending)",
    snapshotData.responded_at === null ||
      typeof snapshotData.responded_at === "string",
  );
  // Step 6: Validate sellerApprovalRequest relation contains full seller profile
  TestValidator.equals(
    "sellerApprovalRequest ID matches request",
    snapshot.sellerApprovalRequest.id,
    requestId,
  );
  TestValidator.equals(
    "sellerApprovalRequest seller email matches",
    snapshot.sellerApprovalRequest.seller.email,
    sellerJoinBody.email,
  );
  TestValidator.equals(
    "sellerApprovalRequest seller shop_name matches",
    snapshot.sellerApprovalRequest.seller.shop_name,
    sellerJoinBody.shop_name,
  );
  // Step 7: Validate snapshot metadata for audit trail
  TestValidator.predicate(
    "snapshot createdAt is valid ISO 8601 date-time",
    /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}/.test(snapshot.createdAt),
  );
  // Step 8: Verify snapshot is suitable for dispute resolution
  // All critical information should be present and readable
  TestValidator.predicate(
    "snapshot contains complete dispute resolution data",
    snapshotData.seller_id !== null &&
      snapshotData.reason !== null &&
      snapshotData.status !== null &&
      snapshotData.submitted_at !== null,
  );
  TestValidator.predicate(
    "snapshot sellerApprovalRequest has complete seller profile",
    snapshot.sellerApprovalRequest.seller.shop_name !== null &&
      snapshot.sellerApprovalRequest.seller.email !== null &&
      snapshot.sellerApprovalRequest.seller.approval_status !== null,
  );
}
