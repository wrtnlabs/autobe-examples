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
 * Test unbanning a previously banned customer account by an administrator.
 *
 * Validates the complete customer unban workflow including administrator authentication, customer account creation, initial ban operation, and subsequent unban operation. Ensures that the customer's banned status is correctly updated to false while preserving all customer data including email, profile information, and timestamps.
 *
 * Special attention is given to verifying that the customer can successfully log in immediately after being unbanned, confirming that the ban status change takes effect instantly and restores full platform access.
 *
 * 1. Administrator authenticates via registration.
 * 2. Customer account is created with valid credentials.
 * 3. Administrator bans the customer account (banned=true).
 * 4. Administrator unbans the customer account (banned=false).
 * 5. Validates customer entity shows banned=false with all data preserved.
 * 6. Customer successfully logs in to verify access restoration.
 */
export async function test_api_customer_unban_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerJoin,
  });
  typia.assert(customer);
  // 3. Ban the customer
  const bannedCustomer =
    await api.functional.shoppingMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customer.id,
        body: { banned: true } satisfies IShoppingMallCustomer.IBanRequest,
      },
    );
  typia.assert(bannedCustomer);
  TestValidator.equals("customer is banned", bannedCustomer.banned, true);
  // 4. Unban the customer
  const unbannedCustomer =
    await api.functional.shoppingMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customer.id,
        body: { banned: false } satisfies IShoppingMallCustomer.IBanRequest,
      },
    );
  typia.assert(unbannedCustomer);
  // 5. Validate unban response
  TestValidator.equals("customer is unbanned", unbannedCustomer.banned, false);
  TestValidator.equals(
    "email preserved",
    unbannedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "profile preserved",
    unbannedCustomer.profile.id,
    customer.profile.id,
  );
  TestValidator.predicate(
    "created_at preserved",
    unbannedCustomer.created_at === customer.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    unbannedCustomer.updated_at !== customer.updated_at,
  );
  // 6. Verify customer can log in after unban
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: customer.email,
    password: customerJoin.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.ILogin;
  const loginResult = await authorize_customer_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login successful after unban",
    loginResult.banned,
    false,
  );
}
