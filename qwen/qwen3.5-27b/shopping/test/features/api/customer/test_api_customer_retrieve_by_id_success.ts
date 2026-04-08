import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving a customer's complete account information by their unique ID.
 *
 * Validates the customer retrieval endpoint by creating a test customer account and retrieving the complete customer record. Ensures that the response contains all required fields including authentication status, account timestamps, and nested profile data.
 *
 * Special attention is given to verifying that the customer ID reference is correctly maintained, that active customers have deleted_at set to null, and that the nested profile object exists with proper structure.
 *
 * 1. Register a new customer account with randomized email and credentials.
 * 2. Retrieve the customer record using their unique ID.
 * 3. Validate response structure and data integrity.
 */
export async function test_api_customer_retrieve_by_id_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  // 2. Retrieve customer by ID
  const retrieved = await api.functional.shoppingMall.customers.at(
    customerConnection,
    {
      customerId: joined.id,
    },
  );
  typia.assert(retrieved);
  // 3. Validate customer data integrity
  TestValidator.equals("customer ID matches", retrieved.id, joined.id);
  TestValidator.equals("email matches input", retrieved.email, joined.email);
  TestValidator.predicate("customer is not banned", retrieved.banned === false);
  TestValidator.equals(
    "deleted_at is null for active customer",
    retrieved.deleted_at,
    null,
  );
  // 4. Validate nested profile object exists
  TestValidator.predicate(
    "profile exists",
    retrieved.profile !== null && retrieved.profile !== undefined,
  );
  TestValidator.predicate("profile has ID", retrieved.profile.id.length > 0);
  TestValidator.predicate(
    "profile has display name",
    retrieved.profile.display_name.length > 0,
  );
}
