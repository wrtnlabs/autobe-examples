import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_administrator_password_resets_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Verify unauthorized access is denied for listing password reset tokens
  // 1. Create and authenticate a customer user
  // 2. Create and authenticate a seller user
  // 3. Trying to access password reset token list endpoint as authenticated customer
  // 4. Expect authorization error
  // 5. Trying to access password reset token list endpoint as authenticated seller
  // 6. Expect authorization error
  // 1. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerPassword123",
    },
  });
  customerConnection.headers = { Authorization: customerJoin.token.access };
  // 2. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerPassword123",
      shopName: "Shop ABC",
    },
  });
  sellerConnection.headers = { Authorization: sellerJoin.token.access };
  // Prepare password reset request filter (blank with pagination)
  const body: IShoppingMallSellerPasswordReset.IRequest = {
    page: 1,
    limit: 10,
  };
  // 3. Try to access password reset token list as customer, expect error
  await TestValidator.httpError(
    "customer unauthorized access denied",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.password_resets.index(
        customerConnection,
        {
          body,
        },
      );
    },
  );
  // 4. Try to access password reset token list as seller, expect error
  await TestValidator.httpError(
    "seller unauthorized access denied",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.password_resets.index(
        sellerConnection,
        {
          body,
        },
      );
    },
  );
}
