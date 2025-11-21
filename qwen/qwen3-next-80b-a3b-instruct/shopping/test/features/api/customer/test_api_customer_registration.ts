import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_registration(
  connection: api.IConnection,
) {
  // Generate realistic test data for customer registration
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  // Execute the customer registration API call
  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.actors.customers.create(connection, {
      body: customerData,
    });

  // Validate that the response matches the expected schema
  typia.assert(createdCustomer);

  // Verify the customer fields match what was sent
  TestValidator.equals(
    "created customer email matches",
    createdCustomer.email,
    customerData.email,
  );
  TestValidator.equals(
    "created customer first name matches",
    createdCustomer.first_name,
    customerData.first_name,
  );
  TestValidator.equals(
    "created customer last name matches",
    createdCustomer.last_name,
    customerData.last_name,
  );

  // Verify status is set to pending_verification as required by business logic
  TestValidator.equals(
    "customer status should be pending_verification",
    createdCustomer.status,
    "pending_verification",
  );

  // Verify password_hash is not included in response (security requirement)
  TestValidator.equals(
    "password_hash should be undefined",
    createdCustomer.password_hash,
    undefined,
  );

  // Verify UUID format for id
  TestValidator.predicate("id is valid UUID", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(createdCustomer.id);
  });
}
