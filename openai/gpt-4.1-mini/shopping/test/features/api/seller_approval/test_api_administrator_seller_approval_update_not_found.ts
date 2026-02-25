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
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_administrator_seller_approval_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a seller approval record using a nonexistent sellerApprovalId.
  // Confirm the API returns a 404 Not Found error when the specified sellerApprovalId is not present in the database.
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create seller approval record to ensure database is non-empty
  await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
    adminConnection,
    {
      body: {},
    },
  );
  // 3. Attempt to update a seller approval using a non-existent sellerApprovalId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IShoppingMallSellerApproval.IUpdate = {
    status: "approved",
  };
  await TestValidator.httpError(
    "updating seller approval with non-existent ID should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.update(
        adminConnection,
        {
          sellerApprovalId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
