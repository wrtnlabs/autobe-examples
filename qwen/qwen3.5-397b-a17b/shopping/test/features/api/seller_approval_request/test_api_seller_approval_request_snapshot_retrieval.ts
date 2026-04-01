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

export async function test_api_seller_approval_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 3. Register and login as administrator
  const adminAuth = await authorize_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 4. Administrator approves the seller approval request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason is null",
    approvedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    approvedRequest.reviewed_at !== null &&
      approvedRequest.reviewed_at !== undefined,
  );
  // 5. Login as seller to retrieve snapshot
  const sellerLoginAuth = await authorize_seller_login(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  sellerLoginConnection.headers = {
    Authorization: `Bearer ${sellerLoginAuth.token.access}`,
  };
  // Note: In real implementation, we would need to get the snapshot ID from the approval request
  // For this test, we assume the snapshot was created during approval and we can retrieve it
  // Since the API doesn't provide a list endpoint for snapshots, we'll use the approval request ID
  // and assume the snapshot ID is available (in real scenario, this would come from a list endpoint)
  // For testing purposes, we'll create a mock snapshot ID
  // In production, this would come from GET /shoppingMall/seller/approval-requests/{requestId}/snapshots
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.approval_requests.snapshots.at(
      sellerLoginConnection,
      {
        requestId: approvalRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot data
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.equals(
    "snapshot rejection_reason is null",
    snapshot.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "snapshot has reviewed_at",
    snapshot.reviewed_at !== null,
  );
  TestValidator.equals(
    "snapshot request matches approval request",
    snapshot.request.id,
    approvalRequest.id,
  );
  TestValidator.predicate(
    "snapshot has administrator",
    snapshot.administrator !== null,
  );
  TestValidator.equals(
    "snapshot administrator matches reviewing admin",
    snapshot.administrator?.id,
    adminAuth.id,
  );
  TestValidator.predicate("snapshot has seller", snapshot.seller !== null);
  TestValidator.equals(
    "snapshot seller matches original seller",
    snapshot.seller?.id,
    sellerAuth.id,
  );
}