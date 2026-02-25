import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_access_denied_for_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt access without authentication: expect 401 Unauthorized
  await TestValidator.httpError(
    "access denied without authentication",
    401,
    async () => {
      const anonConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.seller.dashboard.getSellerDashboard(
        anonConnection,
      );
    },
  );
  // 2. Register new seller (join) but NOT approve the account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        shopName: "Test Shop",
        shopDescription: null,
        logoUri: null,
      },
    },
  );
  typia.assert(seller);
  // This connection has token but is unapproved seller account
  const unapprovedSellerConnection: api.IConnection = { host: connection.host };
  unapprovedSellerConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  // 3. Attempt access with unapproved seller: expect 403 Forbidden
  await TestValidator.httpError(
    "access denied for unapproved seller",
    403,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.getSellerDashboard(
        unapprovedSellerConnection,
      );
    },
  );
}
