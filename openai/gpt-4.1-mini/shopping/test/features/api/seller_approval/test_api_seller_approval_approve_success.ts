import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approval_approve_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Create a seller approval with pending status using generator
  const pendingSellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          status: "pending",
          rejectionReason: null,
        },
      },
    );
  typia.assert(pendingSellerApproval);
  // Record current updatedAt for later comparison
  const oldUpdatedAt = pendingSellerApproval.updatedAt;
  // Approve the seller approval by calling the approve endpoint
  const approvedSellerApproval =
    await api.functional.shoppingMall.administrator.seller_approvals.approve.approveSellerApproval(
      adminConnection,
      {
        sellerApprovalId: pendingSellerApproval.id,
      },
    );
  typia.assert(approvedSellerApproval);
  // Verification: status is 'approved'
  TestValidator.equals(
    "seller approval status updated",
    approvedSellerApproval.status,
    "approved",
  );
  // Verification: rejectionReason is cleared (null or undefined)
  TestValidator.predicate(
    "rejectionReason is cleared",
    approvedSellerApproval.rejectionReason === null ||
      approvedSellerApproval.rejectionReason === undefined,
  );
  // Verification: updatedAt has changed
  TestValidator.predicate(
    "updatedAt is updated",
    new Date(approvedSellerApproval.updatedAt) > new Date(oldUpdatedAt),
  );
  // Valid full structure of the approvedSellerApproval
  typia.assert(approvedSellerApproval);
}
