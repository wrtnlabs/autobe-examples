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
 * Test that a seller can retrieve a snapshot of their rejected seller approval request
 * and view the rejection reason provided by the administrator.
 *
 * This test validates the complete seller approval request rejection workflow:
 * 1. Administrator and seller accounts are created
 * 2. Seller submits an approval request
 * 3. Administrator rejects the request with a specific rejection reason
 * 4. Seller retrieves the snapshot and verifies the rejection reason is preserved
 *
 * Note: In production, the snapshot ID would be obtained from a list snapshots endpoint.
 * This test demonstrates the snapshot retrieval API structure.
 */
export async function test_api_seller_approval_request_snapshot_rejection_reason(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create and login administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create and login seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerLoginConnection,
      { body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request seller matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  // 4. Administrator rejects the approval request with a reason
  const rejectionReason =
    "Insufficient business documentation provided. Please resubmit with complete business registration certificate and tax identification number.";
  const updatedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminLoginConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "request status is rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    updatedRequest.reviewed_at !== null &&
      updatedRequest.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "reviewing administrator is set",
    updatedRequest.reviewingAdministrator?.id,
    adminAuth.id,
  );
  // 5. Seller retrieves the snapshot
  // Note: In production, snapshotId would come from listing snapshots for this request.
  // The snapshot is automatically created when the administrator reviews the request.
  // For this test, we use a generated UUID (actual implementation would query the
  // snapshots list endpoint to get the snapshot ID).
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.seller.approval_requests.snapshots.at(
      sellerLoginConnection,
      {
        requestId: approvalRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contents
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot rejection reason matches",
    snapshot.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "snapshot has reviewed_at",
    snapshot.reviewed_at !== null,
  );
  TestValidator.equals(
    "snapshot seller matches",
    snapshot.seller?.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "snapshot administrator matches",
    snapshot.administrator?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "snapshot request ID matches",
    snapshot.request.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "snapshot request status matches",
    snapshot.request.status,
    "rejected",
  );
}
