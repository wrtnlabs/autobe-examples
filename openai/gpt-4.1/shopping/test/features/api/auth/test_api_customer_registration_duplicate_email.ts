import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer registration rejects duplicate emails.
 *
 * 1. Register a customer using a randomly generated email.
 * 2. Attempt a second registration with the exact same email but different data
 *    for other fields.
 * 3. Assert the second registration attempt returns an error, ensuring email
 *    uniqueness is enforced by the system.
 */
export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Register first customer (occupy the email)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.Format<"password"> =
    typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const name: string & tags.MinLength<2> & tags.MaxLength<64> =
    RandomGenerator.name();
  const phone: string & tags.Pattern<"^[0-9\\-+() ]{8,20}$"> =
    RandomGenerator.mobile();

  const createBody1 = {
    email,
    password,
    name,
    phone,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createBody1,
    });
  typia.assert(customer);
  TestValidator.equals(
    "registered customer email matches input",
    customer.email,
    email,
  );

  // Step 2: Attempt registration with the same email (should be rejected)
  const createBody2 = {
    email, // reusing same email
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(), // new password
    name: RandomGenerator.name(), // new name
    phone: RandomGenerator.mobile(), // new phone
  } satisfies IShoppingMallCustomer.ICreate;

  await TestValidator.error(
    "duplicate registration with same email should be rejected",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: createBody2,
      });
    },
  );
}
