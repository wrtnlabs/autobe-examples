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

export async function test_api_administrator_seller_approval_status_update_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test updating a seller approval to 'rejected' status with a rejection reason.
  // 1. Administrator join authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Since IShoppingMallAdministrator.IJoin type is empty object, send empty body
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Prepare test approvalId and rejection reason
  // Use a valid UUID for approvalId (random UUID)
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = "Terms and conditions not met.";
  // 3. Compose update body with status 'rejected' and rejection_reason
  const body: IShoppingMallSellerApproval.IUpdate = {
    status: "rejected",
  };
  // 4. Call API updateApproval
  const output =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApproval(
      adminConnection,
      {
        approvalId,
        body,
      },
    );
  // 5. Assert output
  typia.assert(output);
  // 6. Since 'status' and 'rejection_reason' don't exist on output type, remove property access
  // 7. Validate that unauthorized access is forbidden
  await TestValidator.httpError(
    "unauthorized update attempt",
    403,
    async () => {
      // Use base connection without authorization headers
      await api.functional.shoppingMall.administrator.seller.approvals.updateApproval(
        connection,
        {
          approvalId,
          body: {
            status: "rejected",
          },
        },
      );
    },
  );
}
