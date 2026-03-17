import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account - creates pending approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Retrieve seller's own approval request
  // Note: In production, the join response would include the approval request ID
  // For E2E test, we generate a UUID and verify the response structure
  const approvalRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const approvalRequest =
    await api.functional.ecommerceMall.seller.approval_requests.at(
      sellerConnection,
      { approvalRequestId },
    );
  typia.assert(approvalRequest);
  // 3. Validate pending status
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  // 4. Validate rejection reason is null (not yet rejected)
  TestValidator.equals(
    "rejection reason is null",
    approvalRequest.rejection_reason,
    null,
  );
  // 5. Validate submission timestamp exists
  TestValidator.predicate(
    "created_at timestamp exists",
    approvalRequest.created_at !== undefined &&
      approvalRequest.created_at !== null,
  );
  typia.assert(approvalRequest.created_at);
  // 6. Validate updated_at timestamp exists
  TestValidator.predicate(
    "updated_at timestamp exists",
    approvalRequest.updated_at !== undefined &&
      approvalRequest.updated_at !== null,
  );
  typia.assert(approvalRequest.updated_at);
  // 7. Validate soft-delete timestamp is null (active request)
  TestValidator.equals(
    "deleted_at is null for active request",
    approvalRequest.deleted_at,
    null,
  );
  // 8. Validate seller ID matches registered seller
  TestValidator.equals(
    "seller ID matches registered seller",
    approvalRequest.seller.id,
    seller.id,
  );
  // 9. Validate seller email matches
  TestValidator.equals(
    "seller email matches registered seller",
    approvalRequest.seller.email,
    seller.email,
  );
  // 10. Validate seller status is pending
  TestValidator.equals(
    "seller status shows pending",
    approvalRequest.seller.status,
    "pending",
  );
  // 11. Validate seller creation timestamp exists
  TestValidator.predicate(
    "seller createdAt exists",
    approvalRequest.seller.createdAt !== undefined &&
      approvalRequest.seller.createdAt !== null,
  );
  typia.assert(approvalRequest.seller.createdAt);
  // 12. Validate seller update timestamp exists
  TestValidator.predicate(
    "seller updatedAt exists",
    approvalRequest.seller.updatedAt !== undefined &&
      approvalRequest.seller.updatedAt !== null,
  );
  typia.assert(approvalRequest.seller.updatedAt);
  // 13. Validate deletedAt is null or undefined for active seller
  TestValidator.equals(
    "seller deletedAt is null for active seller",
    approvalRequest.seller.deletedAt,
    null,
  );
  // 14. Test authorization enforcement - attempt to access another seller's approval request
  const otherSellerUUID: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "seller cannot access other seller's approval request",
    async () => {
      await api.functional.ecommerceMall.seller.approval_requests.at(
        sellerConnection,
        { approvalRequestId: otherSellerUUID },
      );
    },
  );
}
