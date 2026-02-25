import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving an active customer profile by ID.
 *
 * This test validates:
 * 1. Customer profile retrieval returns all expected fields
 * 2. Email matches the registered email
 * 3. deletedAt is null for active accounts
 * 4. Customer ID matches the requested path parameter
 */
export async function test_api_customer_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a test customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Step 2: Retrieve the customer profile using the customer ID
  const customer = await api.functional.shoppingMall.customers.at(connection, {
    customerId: authorized.id,
  });
  typia.assert(customer);
  // Step 3: Validate the response
  TestValidator.equals("customer ID matches", customer.id, authorized.id);
  TestValidator.equals("email matches", customer.email, authorized.email);
  TestValidator.equals(
    "deletedAt is null for active account",
    customer.deletedAt,
    null,
  );
}
