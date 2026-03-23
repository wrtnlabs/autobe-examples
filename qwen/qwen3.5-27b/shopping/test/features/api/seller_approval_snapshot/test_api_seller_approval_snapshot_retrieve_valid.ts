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
 * Test that an authenticated administrator can retrieve a specific seller approval request snapshot.
 *
 * This test validates the complete workflow of:
 * 1. Admin authentication
 * 2. Seller registration and login
 * 3. Seller approval request creation
 * 4. Snapshot retrieval by admin
 * 5. Response validation for snapshot data integrity
 *
 * Note: This test assumes that when a seller approval request is created,
 * an initial snapshot is automatically generated with the same ID as the request.
 */
export async function test_api_seller_approval_snapshot_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Seller setup - create seller connection, join, and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    },
  });
  // Login as seller to get proper authentication
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "1234",
      href: "https://test.com/login",
      referrer: "https://test.com",
    },
  });
  // 3. Create seller approval request
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
  // Extract IDs for snapshot retrieval
  // Assuming initial snapshot has the same ID as the approval request
  const requestId = approvalRequest.id;
  const snapshotId = requestId;
  // 4. Retrieve snapshot as admin
  const snapshot =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.snapshots.at(
      adminConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot response
  TestValidator.equals("snapshot id is uuid", typeof snapshot.id, "string");
  TestValidator.equals(
    "snapshot belongs to correct request",
    snapshot.sellerApprovalRequest.id,
    requestId,
  );
  TestValidator.predicate(
    "snapshotData is valid JSON string",
    typeof snapshot.snapshotData === "string" &&
      snapshot.snapshotData.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid date-time string",
    typeof snapshot.createdAt === "string",
  );
  TestValidator.equals(
    "seller email matches approval request",
    snapshot.sellerApprovalRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "approval request status is pending",
    snapshot.sellerApprovalRequest.status,
    "pending",
  );
}
