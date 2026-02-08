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

export async function test_api_administrator_seller_approval_update_status_approved(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an administrator can update a seller approval status to 'approved'.
  // 1. Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as administrator using join endpoint
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(auth);
  // Use adminConnection for further calls since authorize_administrator_join updates headers internally
  // 3. Call updateApprovalStatus with status 'approved' and no rejection reason
  const updateBody = {
    status: "approved",
    rejection_reason: null,
  } satisfies IShoppingMallSellerApproval.IUpdate;
  const updatedApproval =
    await api.functional.shoppingMall.administrator.seller.approvals.updateApprovalStatus(
      adminConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedApproval);
  // 4. Validate response contents
  TestValidator.predicate(
    "updatedApproval is truthy",
    !!updatedApproval
  );
}
