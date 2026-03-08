import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
 * Test that an administrator can view customer profiles.
 *
 * This test verifies that administrators have proper access to view customer
 * profile information, which is essential for platform oversight and user management.
 * The test creates an administrator and a customer, then validates that the
 * administrator can retrieve the customer's profile through the administrative API.
 */
export async function test_api_customer_profile_banned_customer_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create customer account
  const customerAuth = await authorize_customer_join(connection, {});
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Administrator retrieves customer profile
  const customerProfile =
    await api.functional.shoppingMall.administrator.customers.at(
      adminConnection,
      { customerId },
    );
  typia.assert(customerProfile);
  // 4. Validate profile fields are accessible
  TestValidator.equals("customer ID matches", customerProfile.id, customerId);
  TestValidator.equals(
    "email matches",
    customerProfile.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "has banned field",
    typeof customerProfile.banned === "boolean",
  );
  TestValidator.predicate(
    "has created timestamp",
    typeof customerProfile.createdAt === "string",
  );
  TestValidator.predicate(
    "has updated timestamp",
    typeof customerProfile.updatedAt === "string",
  );
}
