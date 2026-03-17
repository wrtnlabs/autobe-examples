import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test that an administrator can view the profile of a customer and that
 * the banned status field is properly reflected in the response.
 *
 * This validates:
 * - Administrator can retrieve customer profiles by ID
 * - Customer profile contains all expected fields
 * - Banned flag exists and reflects account status
 *
 * @param connection Base connection object
 */
export async function test_api_customer_profile_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Administrator retrieves customer profile
  const customerProfile =
    await api.functional.shoppingMall.administrator.customers.at(
      adminConnection,
      { customerId },
    );
  typia.assert(customerProfile);
  // 4. Validate response
  TestValidator.equals("customer ID matches", customerProfile.id, customerId);
  TestValidator.equals(
    "email matches",
    customerProfile.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "banned status is false for new customer",
    customerProfile.banned,
    false,
  );
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(Date.parse(customerProfile.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(Date.parse(customerProfile.updatedAt)),
  );
}
