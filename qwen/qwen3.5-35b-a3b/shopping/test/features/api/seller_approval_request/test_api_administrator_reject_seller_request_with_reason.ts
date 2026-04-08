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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_administrator_reject_seller_request_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(adminJoined);
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoined);
  // Verify seller starts with pending approval status
  TestValidator.equals(
    "initial seller approval status is pending",
    sellerJoined.approval_status,
    "pending",
  );
  // 3. Seller creates approval request
  const approvalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          request_reason: typia.random<string & tags.MaxLength<500>>(),
        },
      },
    );
  typia.assert(approvalRequest);
  // Validate initial approval request state
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request seller id matches",
    approvalRequest.seller.id,
    sellerJoined.id,
  );
  TestValidator.equals(
    "approval request seller email matches",
    approvalRequest.seller.email,
    sellerJoined.email,
  );
  TestValidator.equals(
    "approval request seller display name matches",
    approvalRequest.seller.display_name,
    sellerJoined.display_name,
  );
  TestValidator.equals(
    "approval request has request reason",
    approvalRequest.requestReason.length > 0,
    true,
  );
  TestValidator.equals(
    "approval request has no reviewer initially",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request has no rejection reason initially",
    approvalRequest.rejectionReason,
    null,
  );
  // 4. Administrator rejects the approval request with a reason
  const rejectionReason =
    typia.random<string & tags.Format<"email">>() +
    " - Business verification failed, please resubmit after addressing issues.";
  const rejectedRequest =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(rejectedRequest);
  // Validate rejection response
  TestValidator.equals(
    "approval request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is set correctly",
    rejectedRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.equals(
    "reviewer is set to admin",
    rejectedRequest.reviewer?.id,
    adminJoined.id,
  );
  TestValidator.equals(
    "reviewer display name is set",
    rejectedRequest.reviewer?.displayName,
    adminJoined.display_name,
  );
  TestValidator.notEquals(
    "updated_at changed after rejection",
    rejectedRequest.updatedAt,
    approvalRequest.createdAt,
  );
  TestValidator.equals(
    "seller relationship includes email",
    rejectedRequest.seller.email,
    sellerJoined.email,
  );
  TestValidator.equals(
    "seller relationship includes display name",
    rejectedRequest.seller.display_name,
    sellerJoined.display_name,
  );
  TestValidator.equals(
    "seller relationship approval status matches",
    rejectedRequest.seller.approval_status,
    "rejected",
  );
  // 5. Verify seller account reflects rejection
  const sellerUpdated = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerJoined.email,
        password: sellerJoined.token.access,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerUpdated);
  TestValidator.equals(
    "seller approval status is rejected after admin rejection",
    sellerUpdated.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "seller rejection reason is visible",
    sellerUpdated.rejection_reason,
    rejectionReason,
  );
}