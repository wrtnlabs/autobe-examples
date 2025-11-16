import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates authenticated customer profile access and business field
 * restriction.
 *
 * This test ensures the following user journey and validations:
 *
 * 1. A new customer is registered using randomized, valid credentials (email,
 *    password, name, phone).
 * 2. The customer is authenticated by join, and their UUID and token are received.
 * 3. Using the authenticated session, the customer requests their own full
 *    profile.
 *
 *    - Validate that all expected business-visible fields match registration (id,
 *         email, name, phone, is_email_verified, timestamps).
 *    - Ensure sensitive/authentication fields (e.g., password, password_hash, token)
 *         are not present in the response object.
 *    - Validate data is returned for correct self-access only.
 * 4. Register a second, unrelated customer and authenticate as them.
 * 5. Attempt to access the first customer’s profile via the GET API using the
 *    second customer’s identity. Assert that this is denied (throws error).
 * 6. Never test type validation or missing properties/scenario combinations
 *    forbidden by system—focus is on business logic, authentication, and strict
 *    data visibility.
 */
export async function test_api_customer_profile_detail_access_by_customer(
  connection: api.IConnection,
) {
  // 1. Register Customer #1
  const customer1_input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer1_auth = await api.functional.auth.customer.join(connection, {
    body: customer1_input,
  });
  typia.assert(customer1_auth);
  const customer1_id = customer1_auth.id;
  const expected_fields = {
    id: customer1_auth.id,
    email: customer1_input.email,
    name: customer1_input.name,
    phone: customer1_input.phone,
    is_email_verified: customer1_auth.is_email_verified,
    created_at: customer1_auth.created_at,
    updated_at: customer1_auth.updated_at,
  };

  // 2. Fetch own profile via GET, validate data
  const customer1_profile =
    await api.functional.shoppingMall.customer.customers.at(connection, {
      customerId: customer1_id,
    });
  typia.assert(customer1_profile);
  // All business fields visible
  TestValidator.equals(
    "customer profile matches own registration (id, email, name, phone, email_verified)",
    {
      id: customer1_profile.id,
      email: customer1_profile.email,
      name: customer1_profile.name,
      phone: customer1_profile.phone,
      is_email_verified: customer1_profile.is_email_verified,
    },
    {
      id: expected_fields.id,
      email: expected_fields.email,
      name: expected_fields.name,
      phone: expected_fields.phone,
      is_email_verified: expected_fields.is_email_verified,
    },
  );
  // Timestamps present
  TestValidator.equals(
    "customer profile has same created_at",
    customer1_profile.created_at,
    expected_fields.created_at,
  );
  TestValidator.equals(
    "customer profile has same updated_at",
    customer1_profile.updated_at,
    expected_fields.updated_at,
  );

  // Password and tokens never present
  TestValidator.predicate(
    "customer profile does not contain password/hash/token fields",
    !Object.prototype.hasOwnProperty.call(customer1_profile, "password") &&
      !Object.prototype.hasOwnProperty.call(
        customer1_profile,
        "password_hash",
      ) &&
      !Object.prototype.hasOwnProperty.call(customer1_profile, "token"),
  );

  // 3. Register Customer #2 and authenticate as them
  const customer2_input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer2_auth = await api.functional.auth.customer.join(connection, {
    body: customer2_input,
  });
  typia.assert(customer2_auth);
  const customer2_id = customer2_auth.id;

  // 4. Attempt access to Customer #1's profile as Customer #2 (should be denied)
  await TestValidator.error(
    "unauthorized customer cannot access another customer's profile",
    async () => {
      await api.functional.shoppingMall.customer.customers.at(connection, {
        customerId: customer1_id,
      });
    },
  );
}
