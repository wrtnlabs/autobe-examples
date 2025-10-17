import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * E2E test for customer registration endpoint.
 *
 * Validates that new customers can register with unique email and hashed
 * passwords. Ensures the response includes correct customer data, proper
 * timestamps, and that duplicate email registrations are rejected. Also
 * verifies optional nickname and phone number fields are handled.
 *
 * Business context: Customer registration is a public operation requiring no
 * authentication but must enforce email uniqueness and return secure, sanitized
 * customer info.
 */
export async function test_api_customer_registration_creates_new_account(
  connection: api.IConnection,
) {
  // Generate random unique email and password_hash
  const email = `test_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password_hash = `hashed_${RandomGenerator.alphaNumeric(16)}`;

  // Attempt customer creation without optional nickname and phone_number
  const requestBody1 = {
    email,
    password_hash,
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer1 = await api.functional.shoppingMall.customers.create(
    connection,
    { body: requestBody1 },
  );

  typia.assert(customer1);

  TestValidator.equals("customer1 email matches input", customer1.email, email);
  TestValidator.predicate(
    "customer1 id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      customer1.id,
    ),
  );
  TestValidator.equals(
    "customer1 status is 'active'",
    customer1.status,
    "active",
  );
  TestValidator.predicate(
    "customer1 created_at is ISO 8601 string",
    !isNaN(Date.parse(customer1.created_at)),
  );
  TestValidator.predicate(
    "customer1 updated_at is ISO 8601 string",
    !isNaN(Date.parse(customer1.updated_at)),
  );
  TestValidator.equals(
    "customer1 nickname is undefined or null",
    customer1.nickname ?? null,
    null,
  );
  TestValidator.equals(
    "customer1 phone_number is undefined or null",
    customer1.phone_number ?? null,
    null,
  );

  // Attempt duplicate customer creation with same email, expect error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.shoppingMall.customers.create(connection, {
        body: requestBody1,
      });
    },
  );

  // Attempt customer creation with optional nickname and phone_number
  const requestBody2 = {
    email: `test_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: `hashed_${RandomGenerator.alphaNumeric(20)}`,
    status: "active",
    nickname: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(
      RandomGenerator.pick(["010", "011", "016", "017", "018", "019"] as const),
    ),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer2 = await api.functional.shoppingMall.customers.create(
    connection,
    { body: requestBody2 },
  );

  typia.assert(customer2);

  TestValidator.equals(
    "customer2 email matches input",
    customer2.email,
    requestBody2.email,
  );
  TestValidator.equals(
    "customer2 status is 'active'",
    customer2.status,
    "active",
  );
  TestValidator.predicate(
    "customer2 id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      customer2.id,
    ),
  );
  TestValidator.predicate(
    "customer2 created_at is ISO 8601 string",
    !isNaN(Date.parse(customer2.created_at)),
  );
  TestValidator.predicate(
    "customer2 updated_at is ISO 8601 string",
    !isNaN(Date.parse(customer2.updated_at)),
  );
  TestValidator.equals(
    "customer2 nickname matches input",
    customer2.nickname,
    requestBody2.nickname,
  );
  TestValidator.equals(
    "customer2 phone_number matches input",
    customer2.phone_number,
    requestBody2.phone_number,
  );
}
