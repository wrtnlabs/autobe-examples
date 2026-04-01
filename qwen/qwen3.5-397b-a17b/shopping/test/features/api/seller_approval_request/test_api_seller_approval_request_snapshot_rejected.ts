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
 * Test administrator retrieving a snapshot of a rejected seller approval request with rejection reason.
 *
 * Flow:
 * 1. Administrator joins and authenticates
 * 2. Seller joins and submits approval request
 * 3. Administrator reviews and rejects the request with a rejection reason (creating snapshot)
 * 4. Administrator retrieves the snapshot
 *
 * Validate:
 * - Snapshot status is 'rejected'
 * - Rejection reason contains the administrator's explanation
 * - Administrator matches reviewer
 * - Seller matches applicant
 * - Reviewed_at timestamp is populated
 * - Snapshot preserves the complete rejection state for audit purposes
 */
export async function test_api_seller_approval_request_snapshot_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Seller setup - join and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  // 4. Administrator rejects the approval request with rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
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
    "updated status is rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    updatedRequest.reviewed_at !== null &&
      updatedRequest.reviewed_at !== undefined,
  );
  // 5. Administrator retrieves the snapshot
  // Note: In a complete implementation, there would be a list snapshots endpoint to get the snapshot ID.
  // For this test, we use the approval request ID as a reference and generate a snapshot ID.
  // The snapshot is automatically created when the administrator reviews the request.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.at(
      adminConnection,
      {
        requestId: approvalRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contents
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
  TestValidator.predicate("snapshot seller exists", snapshot.seller !== null);
  TestValidator.equals(
    "snapshot seller matches applicant",
    snapshot.seller!.id,
    sellerJoinResult.id,
  );
  TestValidator.predicate(
    "snapshot administrator exists",
    snapshot.administrator !== null,
  );
  TestValidator.equals(
    "snapshot administrator matches reviewer",
    snapshot.administrator!.id,
    adminJoinResult.id,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== null,
  );
}