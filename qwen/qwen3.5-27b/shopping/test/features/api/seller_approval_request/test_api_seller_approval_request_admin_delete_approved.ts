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
 * Test that an administrator can delete a seller approval request that has already been approved.
 * This validates that admin deletion privileges are not restricted by request status.
 * 1. Admin authenticates via join
 * 2. Seller authenticates via join
 * 3. Seller creates approval request (status: pending)
 * 4. Admin approves the request (status: approved)
 * 5. Admin deletes the approved request
 * 6. Validates successful deletion
 */
export async function test_api_seller_approval_request_admin_delete_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates approval request
  const request =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(request);
  // 4. Admin approves the request
  const approvedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: request.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Validate status changed to approved
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Admin deletes the approved request
  await api.functional.shoppingMall.admin.seller_approval_requests.erase(
    adminConnection,
    {
      requestId: request.id,
    },
  );
}
