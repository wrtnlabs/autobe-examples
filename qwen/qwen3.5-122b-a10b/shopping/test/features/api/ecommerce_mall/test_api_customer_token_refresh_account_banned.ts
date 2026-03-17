import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_token_refresh_account_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and gets valid tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Store refresh token for later use
  const refreshToken: string = customerAuth.token.refresh;
  // 2. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Admin bans the customer account
  const bannedCustomer = await api.functional.ecommerceMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(bannedCustomer);
  // Verify account status is now 'banned'
  TestValidator.equals(
    "account status is banned",
    bannedCustomer.account_status,
    "banned",
  );
  // 4. Customer attempts to refresh token with valid refresh token
  // Should fail with 403 error because account is banned
  await TestValidator.httpError(
    "token refresh rejected for banned account",
    403,
    async () => {
      await authorize_customer_refresh(customerConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
}