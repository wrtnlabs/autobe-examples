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

export async function test_api_administrator_seller_approval_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection (for unauthenticated call)
  const baseConnection: api.IConnection = { host: connection.host };
  // Create admin connection and authorize join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongPassword123",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 1. Test rejection of unauthenticated user access
  await TestValidator.httpError(
    "reject unauthenticated attempt",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sellerApprovals.createSellerApproval(
        baseConnection,
        {
          body: {
            shoppingMallSellerId: typia.random<string & tags.Format<"uuid">>(),
            status: "approved",
          },
        },
      );
    },
  );
  // 2. Test rejection of invalid authorization token
  const fakeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.httpError("reject unauthorized token", 401, async () => {
    await api.functional.shoppingMall.administrator.sellerApprovals.createSellerApproval(
      fakeConnection,
      {
        body: {
          shoppingMallSellerId: typia.random<string & tags.Format<"uuid">>(),
          status: "approved",
        },
      },
    );
  });
  // 3. Test successful seller approval with authorized administrator
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          shoppingMallSellerId: typia.random<string & tags.Format<"uuid">>(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerApproval);
  // 4. Validate the approval status in response
  TestValidator.equals(
    "approval status is approved",
    sellerApproval.status,
    "approved",
  );
}
