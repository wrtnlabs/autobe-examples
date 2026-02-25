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

export async function test_api_seller_approval_approve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates the behavior when attempting to approve a seller approval that does not exist.
  // It covers the edge case where the sellerApprovalId provided does not match any existing record.
  // The administrator must be authenticated first, then the approval attempt is made.
  // The test asserts that the service returns an appropriate 'not found' or 'bad request' error indicating the invalid identifier or non-existent approval record, preventing unauthorized or erroneous approvals.
  // 1. Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin_password123",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Attempt to approve non-existent seller approval
  const nonExistentSellerApprovalId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Expect error: not found or bad request
  await TestValidator.httpError(
    "approve non-existent seller approval",
    [400, 404],
    async () =>
      await api.functional.shoppingMall.administrator.seller_approvals.approve.approveSellerApproval(
        adminConnection,
        { sellerApprovalId: nonExistentSellerApprovalId },
      ),
  );
}
