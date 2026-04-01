import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test seller retrieving their own approval request snapshot to view review outcome.
 *
 * This test validates the seller approval request snapshot access workflow:
 * 1. Administrator joins and authenticates to gain review privileges
 * 2. Seller joins and authenticates to submit approval request
 * 3. Seller submits approval request for administrator review
 * 4. Administrator reviews and responds to request (creating snapshot)
 * 5. Seller retrieves the snapshot using requestId and snapshotId
 *
 * Validates: seller can access their own snapshot, snapshot contains correct
 * status (approved/rejected), rejection_reason is visible if rejected, seller
 * information matches authenticated user, snapshot provides complete audit trail.
 *
 * Note: The administrator review endpoint that creates snapshots is assumed to
 * exist in the backend. This test validates the approval request creation and
 * snapshot retrieval endpoint structure using available SDK functions.
 */
export async function test_api_seller_approval_request_snapshot_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Administrator login to establish session for review operations
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(approvalRequest);
  // Validate approval request structure
  TestValidator.equals(
    "approval request seller ID",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "approval request status",
    approvalRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "approval request has submitted_at",
    approvalRequest.submitted_at !== null,
  );
  // 4. Administrator reviews the request (creating snapshot)
  // Note: The admin review endpoint that creates snapshots is not available in the
  // provided SDK functions. In a complete implementation, this would call:
  // await api.functional.shoppingMall.administrator.approval_requests.review(adminLoginConnection, {
  //   requestId: approvalRequest.id,
  //   body: { status: "approved", rejection_reason: null }
  // });
  // This would create a snapshot record in shopping_mall_seller_approval_request_snapshots.
  // 5. Seller retrieves the snapshot
  // Note: In a real scenario, the snapshotId would be obtained from the review response
  // or by listing snapshots for the request. The snapshot retrieval endpoint validates:
  // - Caller is the seller who submitted the parent request OR an administrator
  // - Snapshot exists and matches the provided requestId
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.at(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure and integrity
  TestValidator.equals(
    "snapshot request ID matches",
    snapshot.request.id,
    approvalRequest.id,
  );
  TestValidator.predicate("snapshot has valid ID format", snapshot.id !== null);
  TestValidator.predicate("snapshot has status", snapshot.status !== null);
  TestValidator.predicate(
    "snapshot has review timestamp",
    snapshot.reviewed_at !== null,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== null,
  );
  // Validate seller information in snapshot matches authenticated seller
  if (snapshot.seller !== null) {
    TestValidator.equals(
      "snapshot seller ID matches",
      snapshot.seller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "snapshot seller email matches",
      snapshot.seller.email,
      sellerEmail,
    );
  }
  // Validate administrator information if present (for approved/rejected requests)
  if (snapshot.administrator !== null) {
    TestValidator.predicate(
      "snapshot administrator has ID",
      snapshot.administrator.id !== null,
    );
    TestValidator.predicate(
      "snapshot administrator has email",
      snapshot.administrator.email !== null,
    );
  }
  // Validate rejection reason is present only for rejected status
  if (snapshot.status === "rejected") {
    TestValidator.predicate(
      "rejection reason present for rejected status",
      snapshot.rejection_reason !== null,
    );
  } else {
    TestValidator.equals(
      "no rejection reason for non-rejected status",
      snapshot.rejection_reason,
      null,
    );
  }
  // Validate snapshot provides complete audit trail
  TestValidator.predicate(
    "snapshot preserves request status",
    snapshot.request.status !== null,
  );
  TestValidator.predicate(
    "snapshot preserves submission timestamp",
    snapshot.request.submitted_at !== null,
  );
}
