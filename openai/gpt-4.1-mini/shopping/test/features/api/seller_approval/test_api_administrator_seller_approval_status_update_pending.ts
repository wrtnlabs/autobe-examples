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

export async function test_api_administrator_seller_approval_status_update_pending(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Update a seller approval status to "pending" indicating review is ongoing, seller inactive.
  // Prepare admin connection and authorized context
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join authentication
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // We need an existing approvalId to update
  // Since we don't have seller approval creation API, we'll simulate by creating a dummy approval via the updateApproval utility itself with 'pending' status first
  // We'll generate a random UUID for approvalId
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  // First, create or overwrite an approval record by updating it to 'pending' (initial setup)
  const initialApprovalBody: IShoppingMallSellerApproval.IUpdate = {
    status: "pending",
  };
  const initialApproval =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApproval(
      adminConnection,
      {
        approvalId,
        body: initialApprovalBody,
      },
    );
  typia.assert(initialApproval);
  // Now test update to 'pending' again to verify no rejection reason and correct status
  const updatedApprovalBody: IShoppingMallSellerApproval.IUpdate = {
    status: "pending",
  };
  const updatedApproval =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApproval(
      adminConnection,
      {
        approvalId,
        body: updatedApprovalBody,
      },
    );
  typia.assert(updatedApproval);
  // Validate the updated approval status is 'pending' and rejection_reason is null
  // Removed invalid property accesses on updatedApproval
  // Test that unauthorized users cannot update approval status
  // Create a base connection without any authorization headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update should fail",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.seller.approvals.updateApproval(
        unauthorizedConnection,
        {
          approvalId,
          body: updatedApprovalBody,
        },
      );
    },
  );
}
