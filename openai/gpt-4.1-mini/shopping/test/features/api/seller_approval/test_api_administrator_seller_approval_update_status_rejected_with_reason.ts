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

export async function test_api_administrator_seller_approval_update_status_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Compose update body with status "rejected" and a rejection reason
  const rejectionReason =
    "Insufficient documentation provided for seller registration.";
  const updateBody: IShoppingMallSellerApproval.IUpdate = {
    status: "rejected",
    rejection_reason: rejectionReason,
  };
  // Call the patch API via the utility function
  const updatedApproval =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApprovalStatus(
      adminConnection,
      { body: updateBody },
    );
  typia.assert(updatedApproval);
  // Removed validation of non-existent properties
}