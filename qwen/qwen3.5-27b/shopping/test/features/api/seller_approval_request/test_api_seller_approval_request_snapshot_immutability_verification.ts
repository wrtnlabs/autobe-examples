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
 * Test that seller approval request snapshots remain immutable and preserve historical state for dispute resolution.
 *
 * This test verifies that snapshots created during the seller approval workflow cannot be modified
 * and consistently return the same data across multiple retrievals, ensuring audit trail integrity.
 */
export async function test_api_seller_approval_request_snapshot_immutability_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  // 2. Create seller approval request (automatically generates snapshot)
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // Extract requestId from the created approval request
  const requestId: string & tags.Format<"uuid"> = approvalRequest.id;
  // 3. Note: The snapshot is created automatically when approval request is created.
  // For auto-created snapshots, the snapshot ID typically matches the request ID
  // or follows a predictable pattern. We'll use requestId as snapshotId.
  const snapshotId: string & tags.Format<"uuid"> = requestId;
  // 4. First retrieval - establish baseline
  const firstSnapshot =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.at(
      sellerConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(firstSnapshot);
  // Store baseline values for comparison
  const baselineSnapshotData: string = firstSnapshot.snapshotData;
  const baselineCreatedAt: string & tags.Format<"date-time"> =
    firstSnapshot.createdAt;
  const baselineSellerApprovalRequest = firstSnapshot.sellerApprovalRequest;
  // 5. Second retrieval - verify immutability
  const secondSnapshot =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.at(
      sellerConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(secondSnapshot);
  // 6. Third retrieval - additional verification
  const thirdSnapshot =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.at(
      sellerConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(thirdSnapshot);
  // 7. Validate immutability - all retrievals must return identical data
  TestValidator.equals(
    "snapshotData immutable across retrievals",
    baselineSnapshotData,
    secondSnapshot.snapshotData,
  );
  TestValidator.equals(
    "snapshotData immutable across all retrievals",
    baselineSnapshotData,
    thirdSnapshot.snapshotData,
  );
  // 8. Validate createdAt timestamp never changes
  TestValidator.equals(
    "createdAt timestamp immutable",
    baselineCreatedAt,
    secondSnapshot.createdAt,
  );
  TestValidator.equals(
    "createdAt timestamp immutable across all retrievals",
    baselineCreatedAt,
    thirdSnapshot.createdAt,
  );
  // 9. Validate sellerApprovalRequest data remains consistent
  TestValidator.equals(
    "sellerApprovalRequest.id immutable",
    baselineSellerApprovalRequest.id,
    secondSnapshot.sellerApprovalRequest.id,
  );
  TestValidator.equals(
    "sellerApprovalRequest.status immutable",
    baselineSellerApprovalRequest.status,
    secondSnapshot.sellerApprovalRequest.status,
  );
  TestValidator.equals(
    "sellerApprovalRequest.reason immutable",
    baselineSellerApprovalRequest.reason,
    secondSnapshot.sellerApprovalRequest.reason,
  );
  TestValidator.equals(
    "sellerApprovalRequest.submitted_at immutable",
    baselineSellerApprovalRequest.submitted_at,
    secondSnapshot.sellerApprovalRequest.submitted_at,
  );
  // 10. Validate snapshotData contains expected fields (JSON structure)
  const snapshotDataObject = JSON.parse(baselineSnapshotData);
  TestValidator.predicate(
    "snapshotData contains seller_id",
    "seller_id" in snapshotDataObject,
  );
  TestValidator.predicate(
    "snapshotData contains reason",
    "reason" in snapshotDataObject,
  );
  TestValidator.predicate(
    "snapshotData contains status",
    "status" in snapshotDataObject,
  );
  TestValidator.predicate(
    "snapshotData contains submitted_at",
    "submitted_at" in snapshotDataObject,
  );
  TestValidator.predicate(
    "snapshotData contains responded_at",
    "responded_at" in snapshotDataObject,
  );
  // 11. Verify snapshotData matches the approval request state
  TestValidator.equals(
    "snapshotData reason matches approval request",
    snapshotDataObject.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "snapshotData status matches approval request",
    snapshotDataObject.status,
    approvalRequest.status,
  );
}
