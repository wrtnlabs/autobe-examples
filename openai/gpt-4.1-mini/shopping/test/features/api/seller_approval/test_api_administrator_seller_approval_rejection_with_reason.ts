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

/**
 * Test scenario where an administrator rejects a pending seller registration request.
 * The test verifies that the approval status updates to 'rejected', the rejection reason is properly stored and returned,
 * and the seller remains inactive for selling. The response confirms the rejection details accurately.
 * Authorization as administrator via join is required.
 */
export async function test_api_administrator_seller_approval_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. New administrator joins and authorizes
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "SuperSecure123",
    },
  });
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Generate a seller approval request with status 'pending'
  const sellerApprovalPending =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(sellerApprovalPending);
  // 3. Administrator rejects the seller approval with reason
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const rejectionUpdate: IShoppingMallSellerApproval.ICreate = {
    shoppingMallSellerId: sellerApprovalPending.shoppingMallSellerId,
    status: "rejected",
    rejectionReason: rejectionReason,
  };
  const rejectionResponse =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: rejectionUpdate,
      },
    );
  typia.assert(rejectionResponse);
  // 4. Validate response fields
  TestValidator.equals(
    "approval status updated to rejected",
    rejectionResponse.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectionResponse.rejectionReason ?? "",
    rejectionReason,
  );
  TestValidator.equals(
    "seller ID matches",
    rejectionResponse.shoppingMallSellerId,
    sellerApprovalPending.shoppingMallSellerId,
  );
  TestValidator.predicate(
    "seller remains in rejected state",
    rejectionResponse.status === "rejected",
  );
  TestValidator.predicate(
    "response has seller summary",
    rejectionResponse.seller !== null && rejectionResponse.seller !== undefined,
  );
}
