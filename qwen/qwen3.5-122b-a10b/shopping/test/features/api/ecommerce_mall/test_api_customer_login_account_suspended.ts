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

export async function test_api_customer_login_account_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account with known credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  TestValidator.equals(
    "customer account created",
    customer.account_status,
    "active",
  );
  // 2. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(RandomGenerator.alphaNumeric(16)),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Administrator bans (suspends) the customer account
  const bannedCustomer = await api.functional.ecommerceMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customer.id,
    },
  );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "account status changed to banned",
    bannedCustomer.account_status,
    "banned",
  );
  // 4. Attempt customer login with valid credentials - should fail with 403
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "customer login should fail with 403 when account is banned",
    403,
    async () => {
      await authorize_customer_login(customerLoginConnection, {
        body: {
          email: customerEmail,
          password: customerPassword,
        } satisfies IEcommerceMallCustomer.ILogin,
      });
    },
  );
}