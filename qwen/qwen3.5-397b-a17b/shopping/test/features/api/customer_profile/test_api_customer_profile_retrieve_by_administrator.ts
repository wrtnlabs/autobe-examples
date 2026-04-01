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
 * Test that an administrator can successfully retrieve a customer's profile information.
 *
 * This test validates:
 * 1. Administrator can authenticate and access customer management features
 * 2. Customer profile can be retrieved by administrator using customer ID
 * 3. Response contains correct profile data (display_name, phone_number, timestamps, customer info)
 * 4. Profile data matches the customer account that was created
 */
export async function test_api_customer_profile_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Administrator retrieves customer profile
  const profile =
    await api.functional.shoppingMall.administrator.customers.profile.at(
      adminConnection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(profile);
  // 4. Validate profile data matches customer account
  TestValidator.equals("customer ID matches", profile.customer.id, customer.id);
  TestValidator.equals(
    "customer email matches",
    profile.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "display name exists",
    profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "phone number exists",
    profile.phone_number.length > 0,
  );
  TestValidator.predicate("created_at is valid", profile.created_at.length > 0);
  TestValidator.predicate("updated_at is valid", profile.updated_at.length > 0);
  TestValidator.equals("profile not deleted", profile.deleted_at, null);
}
