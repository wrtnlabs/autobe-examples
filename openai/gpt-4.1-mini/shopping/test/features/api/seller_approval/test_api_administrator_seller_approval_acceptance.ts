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

export async function test_api_administrator_seller_approval_acceptance(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario where an administrator successfully approves a pending seller registration request.
  // The test must verify that the approval status updates to 'approved', the seller's selling capabilities become enabled,
  // and the response reflects the updated approval record with correct status and no rejection reason.
  // Authorization as administrator via join is required.
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() /* random email */,
      password: "StrongP@ssw0rd" /* secure password, conforms min length 8 */,
    },
  });
  typia.assert(administrator);
  adminConnection.headers = {
    Authorization: administrator.token.access,
  };
  // 2. Generate a random pending seller approval registration
  const pendingApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          status: "pending",
          rejectionReason: null,
        },
      },
    );
  typia.assert(pendingApproval);
  // 3. Approve the seller registration using the utility function
  const approvedSellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          shoppingMallSellerId: pendingApproval.shoppingMallSellerId,
          status: "approved",
          rejectionReason: null,
        },
      },
    );
  typia.assert(approvedSellerApproval);
  // 4. Verify the returned approval status and related fields
  TestValidator.equals(
    "approval status should be 'approved'",
    approvedSellerApproval.status,
    "approved",
  );
  TestValidator.equals(
    "seller approval rejection reason should be null",
    approvedSellerApproval.rejectionReason ?? null,
    null,
  );
  TestValidator.equals(
    "seller approval id should match initial approval",
    approvedSellerApproval.id,
    pendingApproval.id,
  );
  TestValidator.equals(
    "seller id in approval should match input seller id",
    approvedSellerApproval.shoppingMallSellerId,
    pendingApproval.shoppingMallSellerId,
  );
  // 5. Check that the seller summary approvalStatus is 'approved'
  TestValidator.equals(
    "seller summary's approval status",
    approvedSellerApproval.seller.approvalStatus,
    "approved",
  );
  // 6. Check that the seller summary rejectionReason is null
  TestValidator.equals(
    "seller summary's rejection reason",
    approvedSellerApproval.seller.rejectionReason ?? null,
    null,
  );
}
