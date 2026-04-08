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
 * Test administrator banning and unbanning a customer account.
 *
 * Validates the complete customer ban/unban workflow including administrator authentication, customer account creation, ban operation, and unban operation. Ensures that the customer's data is preserved throughout the ban/unban process and that the banned status is correctly updated.
 *
 * Special attention is given to verifying that the customer retains all data (email, profile, timestamps) after being banned and unbanned, and that the banned field is correctly toggled between true and false.
 *
 * 1. Administrator authenticates via registration.
 * 2. Customer registers with email and password.
 * 3. Administrator bans the customer account (banned: true).
 * 4. Validates customer entity with banned=true and all data preserved.
 * 5. Administrator unbans the customer account (banned: false).
 * 6. Validates customer entity with banned=false and all data still preserved.
 */
export async function test_api_customer_ban_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
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
  // 4. Validate ban operation
  TestValidator.equals("customer banned", bannedCustomer.banned, true);
  TestValidator.equals("email preserved", bannedCustomer.email, customer.email);
  TestValidator.equals(
    "profile preserved",
    bannedCustomer.profile,
    customer.profile,
  );
  TestValidator.predicate("has valid id", bannedCustomer.id.length > 0);
  TestValidator.predicate(
    "has valid created_at",
    bannedCustomer.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    bannedCustomer.updated_at.length > 0,
  );
  // 5. Unban the customer
  const unbannedCustomer =
    await api.functional.shoppingMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customer.id,
        body: { banned: false } satisfies IShoppingMallCustomer.IBanRequest,
      },
    );
  typia.assert(unbannedCustomer);
  // 6. Validate unban operation
  TestValidator.equals("customer unbanned", unbannedCustomer.banned, false);
  TestValidator.equals(
    "email still preserved",
    unbannedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "profile still preserved",
    unbannedCustomer.profile,
    customer.profile,
  );
  TestValidator.predicate(
    "has valid id after unban",
    unbannedCustomer.id.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at after unban",
    unbannedCustomer.updated_at.length > 0,
  );
}
