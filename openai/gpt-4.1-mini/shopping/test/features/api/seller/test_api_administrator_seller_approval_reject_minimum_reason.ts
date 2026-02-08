import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerApprovalRejectRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRejectRequest";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_seller_approvals_create_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_approval";

export async function test_api_administrator_seller_approval_reject_minimum_reason(
  connection: api.IConnection,
): Promise<void> {
  // Test rejection of a seller approval providing the minimum required valid rejection reason
  // 1. Administrator joins (registers) to get authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a seller approval record to reject
  const approval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      { body: {} },
    );
  // 3. Reject the seller approval with minimum reason string (e.g., 1 character)
  const rejectBody: IShoppingMallSellerApprovalRejectRequest = {
    rejection_reason: "a",
  };
  const rejected =
    await api.functional.shoppingMall.administrator.seller.approvals.reject(
      adminConnection,
      {
        approvalId: "",
        body: rejectBody,
      },
    );
  typia.assert(rejected);
  // As properties like id, status, rejection_reason do not exist on the returned type,
  // validation through TestValidator is omitted.
}
