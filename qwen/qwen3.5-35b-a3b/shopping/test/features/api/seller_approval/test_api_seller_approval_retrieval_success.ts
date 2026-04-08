import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform with email and password
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create seller approval request using authenticated seller connection
  const approvalRequest =
    await api.functional.ecommerceMall.seller.seller_approval_requests.create(
      sellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 3. Seller retrieves their approval request by ID
  const retrievedApproval =
    await api.functional.ecommerceMall.seller.seller_approvals.at(
      sellerConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedApproval);
  // 4. Validate response structure and fields
  TestValidator.equals(
    "approval request ID matches",
    retrievedApproval.id,
    approvalRequest.id,
  );
  // 5. Validate seller reference object
  TestValidator.equals(
    "seller display_name matches",
    retrievedApproval.seller.display_name,
    sellerAuth.display_name,
  );
  TestValidator.equals(
    "seller approval_status is pending",
    retrievedApproval.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller is_suspended is false",
    retrievedApproval.seller.is_suspended,
    false,
  );
  TestValidator.notEquals(
    "seller has created_at timestamp",
    retrievedApproval.seller.created_at,
    undefined,
  );
  // 6. Validate approval request fields
  TestValidator.equals(
    "approval status is pending",
    retrievedApproval.status,
    "pending",
  );
  TestValidator.equals(
    "request reason matches input",
    retrievedApproval.requestReason,
    approvalRequest.requestReason,
  );
  // 7. Validate reviewer is null for pending requests
  TestValidator.equals(
    "reviewer is null for pending approval",
    retrievedApproval.reviewer,
    null,
  );
  // 8. Validate rejection reason is null for non-rejected requests
  TestValidator.equals(
    "rejection reason is null for pending approval",
    retrievedApproval.rejectionReason,
    null,
  );
  // 9. Validate timestamps exist
  TestValidator.notEquals(
    "approval has created_at timestamp",
    retrievedApproval.createdAt,
    undefined,
  );
  TestValidator.notEquals(
    "approval has updated_at timestamp",
    retrievedApproval.updatedAt,
    undefined,
  );
  // 10. Validate deleted_at is null (not soft-deleted)
  TestValidator.equals(
    "approval is not soft-deleted",
    retrievedApproval.deletedAt,
    null,
  );
}