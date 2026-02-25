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

export async function test_api_administrator_seller_approval_update_successful_approval_and_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass1234",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create a new seller approval record to update
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      { body: { status: "pending" } },
    );
  typia.assert(sellerApproval);
  // 3. Update approval status to 'approved'
  const approvedUpdateBody: IShoppingMallSellerApproval.IUpdate = {
    status: "approved",
  };
  const approvedResponse =
    await api.functional.shoppingMall.administrator.sellerApprovals.update(
      adminConnection,
      {
        sellerApprovalId: sellerApproval.id,
        body: approvedUpdateBody,
      },
    );
  typia.assert(approvedResponse);
  // 4. Assert the approval status is updated correctly to 'approved'
  TestValidator.equals(
    "updated status is approved",
    approvedResponse.status,
    "approved",
  );
  TestValidator.equals(
    "sellerApproval id matches",
    approvedResponse.id,
    sellerApproval.id,
  );
  // 5. Update approval status to 'rejected' with rejection reason
  const rejectionReason = "Incomplete documentation provided";
  const rejectedUpdateBody: IShoppingMallSellerApproval.IUpdate = {
    status: "rejected",
    rejectionReason: rejectionReason,
  };
  const rejectedResponse =
    await api.functional.shoppingMall.administrator.sellerApprovals.update(
      adminConnection,
      {
        sellerApprovalId: sellerApproval.id,
        body: rejectedUpdateBody,
      },
    );
  typia.assert(rejectedResponse);
  // 6. Assert the approval status is updated correctly to 'rejected' and the reason stored
  TestValidator.equals(
    "updated status is rejected",
    rejectedResponse.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is stored",
    rejectedResponse.rejectionReason,
    rejectionReason,
  );
  // 7. Validate update fails with 404 for non-existent id
  const non_existent_id = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update fails with 404 for non-existent sellerApprovalId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.update(
        adminConnection,
        {
          sellerApprovalId: non_existent_id,
          body: {
            status: "approved",
          },
        },
      );
    },
  );
}
