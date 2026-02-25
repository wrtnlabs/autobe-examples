import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_registration_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginInfo = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234" as any,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminLoginInfo);
  // Create new admin connection with the token
  const adminConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminLoginInfo.token.access,
    },
  };
  // 2. Admin approves a pending seller registration request
  const approvalResponse =
    await api.functional.shoppingMall.admin.admin.requests.approve.approveRequest(
      adminConnectionWithToken,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          approval_action: "approved",
        } satisfies IShoppingMallSellerApproval.IApprovalRequest,
      },
    );
  typia.assert(approvalResponse);
  // 3. Validate approval response structure
  TestValidator.equals(
    "approval status is approved",
    approvalResponse.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "has valid seller ID",
    () =>
      approvalResponse.shopping_mall_seller_id !== null &&
      approvalResponse.shopping_mall_seller_id !== undefined,
  );
  TestValidator.predicate(
    "has valid shop name",
    () =>
      approvalResponse.shop_name !== null &&
      approvalResponse.shop_name !== undefined &&
      approvalResponse.shop_name.length > 0,
  );
  TestValidator.predicate(
    "has approval date",
    () =>
      approvalResponse.approval_date !== null &&
      approvalResponse.approval_date !== undefined,
  );
}
