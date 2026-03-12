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
 * Test that an administrator can retrieve a seller approval request with 'pending' status
 * and verify all fields are correctly populated before admin response.
 *
 * Test Flow:
 * 1. Authenticate as administrator via /shoppingMall/auth/admin/join
 * 2. Register a new seller account via /shoppingMall/auth/seller/join
 * 3. Submit a seller approval request via /shoppingMall/seller/seller-approval-requests
 * 4. Retrieve the request using GET /shoppingMall/admin/seller-approval-requests/{id}
 * 5. Verify status='pending', responded_at=null, and all fields are populated correctly
 */
export async function test_api_seller_approval_request_retrieve_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  // 3. Submit a seller approval request
  const approvalReason = RandomGenerator.paragraph({ sentences: 5 });
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: approvalReason,
        },
      },
    );
  typia.assert(approvalRequest);
  // 4. Retrieve the request as administrator
  const retrievedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.getByApprovalrequestid(
      adminConnection,
      {
        approvalRequestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Verify the response contains correct fields
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.predicate("submitted_at is valid datetime", () => {
    const date = new Date(retrievedRequest.submitted_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "reason matches submitted",
    retrievedRequest.reason,
    approvalReason,
  );
  TestValidator.equals(
    "seller shop_name matches",
    retrievedRequest.seller.shop_name,
    sellerJoinBody.shop_name,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    sellerJoinBody.email,
  );
  TestValidator.equals(
    "seller approval_status is pending",
    retrievedRequest.seller.approval_status,
    "pending",
  );
  TestValidator.predicate("created_at is valid datetime", () => {
    const date = new Date(retrievedRequest.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid datetime", () => {
    const date = new Date(retrievedRequest.updated_at);
    return !isNaN(date.getTime());
  });
}
