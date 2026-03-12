import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
 * Test that an already approved seller approval request cannot be updated again.
 *
 * This test verifies that once a seller approval request has been approved by an
 * administrator, any subsequent attempts to update the request (e.g., to reject it)
 * are properly rejected by the system. This ensures the immutability of approved
 * decisions and prevents administrators from accidentally changing approval status.
 */
export async function test_api_seller_approval_request_cannot_update_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup - register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller initial approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // 3. Seller submits approval request
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
  TestValidator.equals(
    "initial status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "responded_at is null initially",
    approvalRequest.responded_at === null,
  );
  // 4. Admin approves the request first
  const approvedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set after approval",
    approvedRequest.responded_at !== null,
  );
  const firstRespondedAt = approvedRequest.responded_at!;
  // 5. Verify seller's approval_status was updated
  const sellerReauth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerReauth);
  TestValidator.equals(
    "seller approval status updated to approved",
    sellerReauth.approval_status,
    "approved",
  );
  // 6. Admin attempts to update the same request again (should fail)
  await TestValidator.error(
    "cannot update already approved request",
    async () => {
      await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
        adminConnection,
        {
          requestId: approvalRequest.id,
          body: {
            status: "rejected",
            rejection_reason: "This update should not be allowed",
          } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
        },
      );
    },
  );
  // 7. Verify attempted rejection did not change the status
  const verificationRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(verificationRequest);
  TestValidator.equals(
    "status remains approved after failed rejection",
    verificationRequest.status,
    "approved",
  );
  TestValidator.equals(
    "responded_at preserved from original approval",
    verificationRequest.responded_at,
    firstRespondedAt,
  );
}
