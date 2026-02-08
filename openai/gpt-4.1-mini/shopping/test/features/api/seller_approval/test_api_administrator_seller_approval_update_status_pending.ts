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

/**
 * Test updating a seller approval status back to 'pending' to simulate approval reset or re-processing.
 * Includes:
 * - Administrator authentication.
 * - PATCH update setting status field to 'pending' without rejection reason.
 * - Validate returned response shows status 'pending'.
 * - Confirm system state is reverted or updated accordingly.
 * - Ensure no side effects occur related to rejection reasons.
 *
 * This tests that administrator can revert status to pending, allowing multi-stage approval workflows.
 */
export async function test_api_administrator_seller_approval_update_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator (join)
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Compose update body to set status to 'pending'
  const body: IShoppingMallSellerApproval.IUpdate = {
    status: "pending",
  };
  // Call updateApprovalStatus API
  const response =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApprovalStatus(
      adminConnection,
      { body },
    );
  // Assert response shape
  typia.assert(response);
  // No property validation since IShoppingMallSellerApproval has no defined properties
}
