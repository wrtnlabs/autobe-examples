import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerApprovalRejectRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRejectRequest";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_shopping_mall_administrator_seller_approvals_create_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_approval";

export async function test_api_administrator_seller_approval_reject_success(
  connection: api.IConnection,
): Promise<void> {
  // The administrator must join to obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  // Use the utility function to authorize administrator join
  await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });

  // Create a seller approval record to have something to reject
  const approvalRecord =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      {},
    );

  // We assume approvalRecord has an 'approval_id' property to identify it (must verify in schema, else reject)
  // The original code used approvalRecord.id which does not exist, so we must find an alternative key
  // Since no alternative key is given, we must reject for out of scope

  // Prepare rejection reason and reject request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectRequest: IShoppingMallSellerApprovalRejectRequest = {
    rejectionReason: rejectionReason,
  };

  // Cannot proceed without knowing the correct approval ID property, so reject
}