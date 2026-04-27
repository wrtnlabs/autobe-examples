import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an administrator can successfully unban a previously banned customer account.
 *
 * Validates the complete ban-to-unban workflow for customer accounts, ensuring that after unbanning, the customer's ability to log in is fully restored. The customer account data (profile, orders, reviews) remains intact throughout the process.
 *
 * 1. Administrator registers a new admin account to obtain privileged authentication.
 * 2. Customer registers a new customer account with known credentials, capturing the customer ID.
 * 3. Administrator bans the customer account, setting the banned_at timestamp.
 * 4. Administrator unbans the customer account, clearing banned_at to null.
 * 5. Customer successfully logs in with their original credentials, proving the ban was lifted.
 */
export async function test_api_administrator_customer_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Customer setup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(customer);
  const customerId: string = customer.id;
  // 3. Administrator bans the customer
  const banned = await api.functional.eCommerceMall.administrator.customers.ban(
    adminConnection,
    { customerId },
  );
  typia.assert(banned);
  TestValidator.predicate(
    "banned_at is set after ban",
    banned.banned_at !== null,
  );
  // 4. Administrator unbans the customer
  const unbanned =
    await api.functional.eCommerceMall.administrator.customers.unban(
      adminConnection,
      { customerId },
    );
  typia.assert(unbanned);
  TestValidator.equals(
    "banned_at is null after unban",
    unbanned.banned_at,
    null,
  );
  // 5. Customer can log in again after being unbanned
  const loginConnection: api.IConnection = { host: connection.host };
  const reLogin = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallCustomer.ILogin,
  });
  typia.assert(reLogin);
  TestValidator.equals(
    "login response confirms unbanned",
    reLogin.banned_at,
    null,
  );
}
