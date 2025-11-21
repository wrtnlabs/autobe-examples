import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer registration with duplicate email address to validate proper
 * error handling and uniqueness constraints. Ensures the system correctly
 * identifies existing email addresses and prevents duplicate account creation
 * while maintaining data integrity and providing clear error messages to
 * users.
 */
export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique test data for the first customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123";
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const ip = "192.168.1.1";
  const href = "https://example.com/register";
  const referrer = "https://example.com";

  // Create the first customer account
  const firstCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      ip,
      href,
      referrer,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(firstCustomer);

  // Verify the first customer was created successfully
  TestValidator.equals(
    "first customer email matches",
    firstCustomer.email,
    email,
  );
  TestValidator.equals(
    "first customer first name matches",
    firstCustomer.first_name,
    firstName,
  );
  TestValidator.equals(
    "first customer last name matches",
    firstCustomer.last_name,
    lastName,
  );

  // Attempt to create a second customer with the same email address
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      return await api.functional.auth.customer.join(connection, {
        body: {
          email,
          password: "DifferentPassword456",
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          ip,
          href,
          referrer,
        } satisfies IShoppingMallCustomer.ICreate,
      });
    },
  );
}
