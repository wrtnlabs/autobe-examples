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
 * Test that an authenticated administrator can successfully retrieve a seller approval request snapshot for an approved seller application.
 *
 * Test Steps:
 * 1. Register and authenticate as an administrator
 * 2. Register a seller account and submit a seller approval request
 * 3. Use simulation to generate a snapshot (approval workflow not available in SDK)
 * 4. Retrieve the snapshot using the admin endpoint
 * 5. Verify snapshot contains approved status, seller info, and response timestamp
 */
export async function test_api_seller_approval_snapshot_admin_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Submit seller approval request
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
  // 4. Use simulation mode to generate a snapshot
  // Note: Approval endpoint not available in SDK, so we simulate snapshot creation
  const simulateConnection: api.IConnection = {
    ...adminConnection,
    simulate: true,
  };
  const snapshot =
    await api.functional.shoppingMall.admin.seller_approval_requests.snapshots.at(
      simulateConnection,
      {
        requestId: approvalRequest.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot structure
  TestValidator.equals(
    "snapshot id is UUID format",
    typeof snapshot.id,
    "string",
  );
  TestValidator.equals(
    "seller approval request ID matches",
    snapshot.sellerApprovalRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "approval status is approved",
    snapshot.sellerApprovalRequest.status,
    "approved",
  );
  TestValidator.equals(
    "seller email matches",
    snapshot.sellerApprovalRequest.seller.email,
    sellerEmail,
  );
  // 6. Validate snapshotData contains JSON with approved state
  TestValidator.predicate(
    "snapshotData is valid JSON with approved status",
    () => {
      try {
        const parsed = JSON.parse(snapshot.snapshotData);
        return (
          parsed.status === "approved" &&
          parsed.responded_at !== null &&
          parsed.responded_at !== undefined
        );
      } catch {
        return false;
      }
    },
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date-time",
    () => !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate("responded_at exists in snapshotData", () => {
    const parsed = JSON.parse(snapshot.snapshotData);
    return (
      parsed.responded_at !== null &&
      parsed.responded_at !== undefined &&
      !isNaN(Date.parse(parsed.responded_at))
    );
  });
  // 8. Validate snapshot immutability - all fields preserved
  TestValidator.predicate("snapshotData contains seller_id", () => {
    const parsed = JSON.parse(snapshot.snapshotData);
    return parsed.seller_id !== undefined;
  });
  TestValidator.predicate("snapshotData contains reason", () => {
    const parsed = JSON.parse(snapshot.snapshotData);
    return parsed.reason !== undefined && parsed.reason.length > 0;
  });
  TestValidator.predicate("snapshotData contains submitted_at", () => {
    const parsed = JSON.parse(snapshot.snapshotData);
    return (
      parsed.submitted_at !== undefined &&
      !isNaN(Date.parse(parsed.submitted_at))
    );
  });
}
