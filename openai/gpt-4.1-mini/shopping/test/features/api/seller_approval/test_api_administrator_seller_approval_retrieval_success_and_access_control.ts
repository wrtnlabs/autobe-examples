import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_administrator_seller_approval_retrieval_success_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve an existing seller approval record
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Create a new seller approval record
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      { body: {} },
    );
  typia.assert(sellerApproval);
  // Retrieve the seller approval record by approvalId
  const approvalId = (sellerApproval as any).id;
  const retrievedApproval =
    await api.functional.shoppingMall.administrator.seller.approvals.at(
      adminConnection,
      { approvalId },
    );
  typia.assert(retrievedApproval);
  // Validate fields: id, shopping_mall_seller_id, status, rejection_reason, created_at, updated_at, deleted_at
  TestValidator.equals(
    "approval id matches",
    (retrievedApproval as any).id,
    (sellerApproval as any).id,
  );
  TestValidator.equals(
    "shopping_mall_seller_id matches",
    (retrievedApproval as any).shopping_mall_seller_id,
    (sellerApproval as any).shopping_mall_seller_id,
  );
  TestValidator.equals(
    "status matches",
    (retrievedApproval as any).status,
    (sellerApproval as any).status,
  );
  TestValidator.equals(
    "rejection_reason matches",
    (retrievedApproval as any).rejection_reason,
    (sellerApproval as any).rejection_reason,
  );
  TestValidator.equals(
    "created_at matches",
    (retrievedApproval as any).created_at,
    (sellerApproval as any).created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    (retrievedApproval as any).updated_at,
    (sellerApproval as any).updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    (retrievedApproval as any).deleted_at,
    (sellerApproval as any).deleted_at,
  );
  // Scenario 2: Attempt to retrieve a non-existent seller approval
  const nonExistentApprovalId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent approval results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.seller.approvals.at(
        adminConnection,
        { approvalId: nonExistentApprovalId },
      );
    },
  );
  // Scenario 3: Authorization enforcement
  // Attempt access without authentication
  await TestValidator.httpError(
    "unauthenticated access denied",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.seller.approvals.at(
        connection,
        {
          approvalId: approvalId,
        },
      );
    },
  );
  // Attempt access with unauthorized role (e.g., seller or customer connection)
  // Since we don't have seller or customer connection utilities here, simulate with fresh connection with no auth headers
  await TestValidator.httpError("unauthorized access denied", 403, async () => {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await api.functional.shoppingMall.administrator.seller.approvals.at(
      unauthorizedConnection,
      { approvalId: approvalId },
    );
  });
  // Confirm successful retrieval again with administrator
  const confirmRetrieval =
    await api.functional.shoppingMall.administrator.seller.approvals.at(
      adminConnection,
      { approvalId: approvalId },
    );
  typia.assert(confirmRetrieval);
}
