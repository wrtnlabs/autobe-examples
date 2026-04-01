import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

/**
 * Test that an administrator can successfully retrieve a complete customer account by UUID.
 *
 * This test validates the administrator customer retrieval endpoint by:
 * 1. Registering and authenticating an administrator account
 * 2. Creating a test customer account with profile information
 * 3. Retrieving the customer account using the administrator's authentication
 * 4. Verifying all customer fields are correctly returned including profile data
 */
export async function test_api_administrator_customer_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Create test customer account
  const customerJoin = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoin);
  // 3. Retrieve customer account as administrator
  const customer = await api.functional.shoppingMall.administrator.customers.at(
    adminConnection,
    {
      customerId: customerJoin.id,
    },
  );
  typia.assert(customer);
  // 4. Verify customer information matches
  TestValidator.equals("customer id matches", customer.id, customerJoin.id);
  TestValidator.equals("email matches", customer.email, customerJoin.email);
  TestValidator.equals(
    "profile display name matches",
    customer.profile.display_name,
    customerJoin.profile.display_name,
  );
  TestValidator.equals(
    "profile phone number matches",
    customer.profile.phone_number,
    customerJoin.profile.phone_number,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    customer.deleted_at,
    null,
  );
}