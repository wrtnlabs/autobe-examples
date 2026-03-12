import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test the primary success path for retrieving a seller approval request snapshot.
 *
 * 1. Register a seller account and authenticate
 * 2. Submit a seller approval request
 * 3. Retrieve the snapshot using the requestId and snapshotId
 * 4. Validate the snapshot response structure and content
 */
export async function test_api_seller_approval_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(2),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // 2. Create seller approval request
  const approvalRequest: IShoppingMallSellerApprovalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 3. In a real scenario, we would list snapshots and get a valid snapshotId.
  // For this test, we assume the system creates a snapshot with the same ID
  // as the approval request (common test environment pattern).
  const requestId: string & tags.Format<"uuid"> = approvalRequest.id;
  const snapshotId: string & tags.Format<"uuid"> = approvalRequest.id;
  // 4. Retrieve the snapshot
  const snapshot: IShoppingMallSellerApprovalSnapshot =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.at(
      sellerConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot structure and content
  TestValidator.equals("snapshot id is valid UUID", snapshot.id, snapshotId);
  TestValidator.predicate(
    "snapshot belongs to correct request",
    snapshot.sellerApprovalRequest.id === requestId,
  );
  TestValidator.equals(
    "snapshot seller matches approval request seller",
    snapshot.sellerApprovalRequest.id,
    approvalRequest.id,
  );
  // 6. Verify snapshotData contains expected fields
  const snapshotData = JSON.parse(snapshot.snapshotData) as {
    seller_id: string;
    reason: string;
    status: string;
    submitted_at: string;
    responded_at: string | null;
  };
  typia.assert(snapshotData);
  TestValidator.equals(
    "snapshotData seller_id matches request seller",
    snapshotData.seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "snapshotData reason matches approval request",
    snapshotData.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "snapshotData status is pending",
    snapshotData.status,
    "pending",
  );
  TestValidator.predicate(
    "snapshotData submitted_at is valid timestamp",
    !isNaN(Date.parse(snapshotData.submitted_at)),
  );
  TestValidator.predicate(
    "snapshot has valid createdAt timestamp",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
}
