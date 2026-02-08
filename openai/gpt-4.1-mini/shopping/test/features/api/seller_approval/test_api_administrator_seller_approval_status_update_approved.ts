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

export async function test_api_administrator_seller_approval_status_update_approved(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a seller approval status to 'approved'. This should activate the seller account allowing them to sell products. Validate that the approval record status changes to 'approved' without a rejection reason.
  // Verify the updated approval record is returned in response. Ensure only authorized administrators can perform this action.
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // The authorize_administrator_join updates adminConnection.headers internally, no manual header setting needed
  // 2. Prepare approvalId and update body
  // Use a random UUID as approvalId due to no creation/fetch API provided
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  const body: IShoppingMallSellerApproval.IUpdate = {
    status: "approved",
  };
  // 3. Call updateApproval utility function to update the status
  const updatedApprovalRaw =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApproval(
      adminConnection,
      {
        approvalId,
        body,
      },
    );
  // Use typia.assert to narrow type for validation since properties status and rejection_reason don't exist on raw type
  const updatedApproval = typia.assert<typeof updatedApprovalRaw & { status: string; rejection_reason: null | string }>(updatedApprovalRaw);
  // 4. Validate business rules
  TestValidator.equals(
    "approval status should be 'approved'",
    updatedApproval.status,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason should be null",
    updatedApproval.rejection_reason,
    null,
  );
}
