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
 * Test that an authenticated administrator can retrieve detailed information
 * about a specific seller approval request by its unique identifier.
 *
 * 1. Authenticate as an administrator
 * 2. Create a seller account and submit an approval request
 * 3. Retrieve the approval request by ID as admin
 * 4. Validate response structure and content
 */
export async function test_api_seller_approval_request_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account and approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 3. Retrieve the approval request by ID as admin
  const retrievedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.getByApprovalrequestid(
      adminConnection,
      {
        approvalRequestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate response structure and content
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "shop name matches",
    retrievedRequest.seller.shop_name,
    sellerAuth.shop_name,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "seller approval_status is pending",
    retrievedRequest.seller.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "reason has content",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.equals(
    "responded_at is null",
    retrievedRequest.responded_at,
    null,
  );
}
