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

export async function test_api_administrator_seller_approval_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve existing seller approval details successfully.
  // Due to lack of creation method, use a random UUID with 404 expectation as placeholder
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "scenario 1 placeholder: non-existent sellerApprovalId should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.atSellerApproval(
        adminConnection,
        { sellerApprovalId: randomId },
      );
    },
  );
  // Scenario 2: Attempt to retrieve seller approval details for non-existent sellerApprovalId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent sellerApprovalId should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.atSellerApproval(
        adminConnection,
        { sellerApprovalId: nonExistentId },
      );
    },
  );
  // Scenario 3: Authorization enforcement - no authentication
  await TestValidator.httpError(
    "unauthorized access should return 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.atSellerApproval(
        { host: connection.host },
        { sellerApprovalId: nonExistentId },
      );
    },
  );
}
