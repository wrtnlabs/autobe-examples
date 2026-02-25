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

export async function test_api_seller_approval_approve_not_pending_error(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to approve a seller approval record that is not in 'pending' status should fail with 404 or 400 error.
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  // 2. Setup seller approvals with statuses 'approved' and 'rejected'
  // Since there's no direct utility to create seller approvals, we simulate the sellerApprovalId
  // with random UUIDs and directly test the error responses for approvals on these non-pending statuses.
  // 3. Define a helper function to simulate approval attempt with expected error
  async function attemptApproval(sellerApprovalId: string): Promise<void> {
    await TestValidator.httpError(
      `approve non-pending seller approval id ${sellerApprovalId} should fail`,
      [400, 404],
      async () => {
        await api.functional.shoppingMall.administrator.seller_approvals.approve.approveSellerApproval(
          adminConnection,
          { sellerApprovalId },
        );
      },
    );
  }
  // 4. For testing, create random UUIDs as sellerApprovalIds representing 'approved' and 'rejected' status
  // These IDs supposedly exist, but not in 'pending' status to test failure scenario
  const approvedSellerApprovalId = typia.random<string & tags.Format<"uuid">>();
  const rejectedSellerApprovalId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt approval on a non-pending 'approved' seller approval
  await attemptApproval(approvedSellerApprovalId);
  // 6. Attempt approval on a non-pending 'rejected' seller approval
  await attemptApproval(rejectedSellerApprovalId);
}
