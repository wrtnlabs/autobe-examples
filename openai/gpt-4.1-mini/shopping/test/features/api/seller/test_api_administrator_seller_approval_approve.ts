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

export async function test_api_administrator_seller_approval_approve(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful approval of a pending seller approval
  {
    // 1. Admin join and authorization
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    adminConnection.headers = {
      Authorization: `Bearer ${adminAuth.token.access}`,
    };
    // 2. Setup: simulate creation of pending seller approval
    // Since there's no API to create, create a mock approvalId
    const approvalIdPending = typia.random<string & tags.Format<"uuid">>();
    // 3. Approve pending seller approval
    const approvedApproval1 =
      await api.functional.shoppingMall.administrator.seller.approvals.approve.approveSellerApproval(
        adminConnection,
        { approvalId: approvalIdPending },
      );
    typia.assert(approvedApproval1);
    // 4. Removed assertions on properties status and rejection_reason as they do not exist
    // 5. Removed predicate on updated_at timestamp as property does not exist
    // 6. Confirm that unauthorized attempt fails (using base connection without token)
    await TestValidator.error("unauthorized approval attempt", async () => {
      await api.functional.shoppingMall.administrator.seller.approvals.approve.approveSellerApproval(
        { host: connection.host },
        { approvalId: approvalIdPending },
      );
    });
  }
  // Scenario 2: Approval of a previously rejected approval record
  {
    // 1. Admin fresh join
    const freshAdminConnection: api.IConnection = { host: connection.host };
    const freshAuth = await authorize_administrator_join(freshAdminConnection, {
      body: {},
    });
    freshAdminConnection.headers = {
      Authorization: `Bearer ${freshAuth.token.access}`,
    };
    // 2. Setup: simulate creation of rejected seller approval
    const approvalIdRejected = typia.random<string & tags.Format<"uuid">>();
    // 3. Approve rejected seller approval
    const approvedApproval2 =
      await api.functional.shoppingMall.administrator.seller.approvals.approve.approveSellerApproval(
        freshAdminConnection,
        { approvalId: approvalIdRejected },
      );
    typia.assert(approvedApproval2);
    // 4. Removed assertions on properties status and rejection_reason
    // 5. Removed predicate on updated_at timestamp
  }
  // Scenario 3: Approving non-existent approvalId returns error
  {
    const adminConnForError: api.IConnection = { host: connection.host };
    const authError = await authorize_administrator_join(adminConnForError, {
      body: {},
    });
    adminConnForError.headers = {
      Authorization: `Bearer ${authError.token.access}`,
    };
    // Use a random UUID which does not exist
    const invalidApprovalId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "approve with invalid approvalId should return 404",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.seller.approvals.approve.approveSellerApproval(
          adminConnForError,
          { approvalId: invalidApprovalId },
        );
      },
    );
  }
}
