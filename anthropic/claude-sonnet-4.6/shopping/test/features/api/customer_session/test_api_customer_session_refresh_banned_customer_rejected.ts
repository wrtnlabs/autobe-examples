import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_refresh_banned_customer_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and capture refresh token
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  const refreshToken = customerAuth.token.refresh;
  // Step 2: Register an admin and establish admin session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 3: Ban the customer using the admin connection
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId,
    },
  );
  typia.assert(bannedCustomer);
  TestValidator.predicate("customer is now banned", bannedCustomer.isBanned);
  // Step 4: Attempt to refresh the banned customer's session — expect 403 Forbidden
  await TestValidator.httpError(
    "banned customer refresh token rejected with 403",
    403,
    async () => {
      await authorize_customer_refresh(customerConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
