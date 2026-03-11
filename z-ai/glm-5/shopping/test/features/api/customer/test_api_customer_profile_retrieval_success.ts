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
 * Test that an administrator can successfully retrieve a customer's complete
 * profile information by their unique identifier.
 *
 * **Prerequisites:**
 * 1. Create an administrator account and authenticate
 * 2. Create a customer account to retrieve
 *
 * **Test Steps:**
 * 1. Authenticate as administrator using the join endpoint
 * 2. Retrieve the customer's profile using the customerId path parameter
 * 3. Verify the response contains complete customer entity
 */
export async function test_api_customer_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create customer connection and register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
    },
  });
  // 3. Retrieve the customer's profile as administrator
  const customer = await api.functional.shoppingMall.administrator.customers.at(
    adminConnection,
    {
      customerId: customerAuthorized.id,
    },
  );
  typia.assert(customer);
  // 4. Validate customer profile data
  TestValidator.equals(
    "customer id matches",
    customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "email matches",
    customer.email,
    customerAuthorized.email,
  );
  TestValidator.predicate(
    "banned is boolean",
    typeof customer.banned === "boolean",
  );
}
