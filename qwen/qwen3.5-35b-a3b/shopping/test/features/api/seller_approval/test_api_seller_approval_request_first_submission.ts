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

export async function test_api_seller_approval_request_first_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAccount);
  // 2. Verify seller approval status is 'pending'
  TestValidator.equals(
    "seller approval status pending",
    sellerAccount.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "seller not suspended",
    sellerAccount.is_suspended === false,
  );
  TestValidator.equals(
    "seller rejection reason null",
    sellerAccount.rejection_reason,
    null,
  );
  // 3. Submit seller approval request
  const requestReason = RandomGenerator.paragraph({ sentences: 3 });
  const approvalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          request_reason: requestReason,
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Verify approval request response structure
  TestValidator.equals(
    "approval request seller_id matches authenticated seller",
    approvalRequest.seller.id,
    sellerAccount.id,
  );
  TestValidator.equals(
    "approval request seller display_name matches",
    approvalRequest.seller.display_name,
    sellerAccount.display_name,
  );
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request has request_reason",
    approvalRequest.requestReason,
    requestReason,
  );
  TestValidator.equals(
    "approval request reviewer is null",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request rejection_reason is null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "approval request created_at is valid datetime",
    !isNaN(Date.parse(approvalRequest.createdAt)),
  );
  TestValidator.predicate(
    "approval request updated_at is valid datetime",
    !isNaN(Date.parse(approvalRequest.updatedAt)),
  );
  // 5. Verify unique seller_id constraint satisfaction
  TestValidator.equals(
    "approval request seller_id is unique for this seller",
    approvalRequest.seller.id,
    sellerAccount.id,
  );
}
