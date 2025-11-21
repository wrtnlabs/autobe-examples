import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_profile_retrieval(
  connection: api.IConnection,
) {
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.actors.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  const retrievedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.actors.customers.at(connection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);

  // Verify public fields are present and correct
  TestValidator.equals(
    "customer ID matches",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer first name matches",
    retrievedCustomer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer last name matches",
    retrievedCustomer.last_name,
    customer.last_name,
  );
  TestValidator.equals(
    "customer status is active",
    retrievedCustomer.status,
    "active",
  );
  TestValidator.equals(
    "created_at is ISO datetime",
    retrievedCustomer.created_at,
    customer.created_at,
  );
  TestValidator.equals(
    "updated_at is ISO datetime",
    retrievedCustomer.updated_at,
    customer.updated_at,
  );

  // Verify private fields are not exposed (should be undefined)
  TestValidator.equals(
    "password_hash is not exposed",
    retrievedCustomer.password_hash,
    undefined,
  );
  TestValidator.equals(
    "deleted_at is not exposed",
    retrievedCustomer.deleted_at,
    undefined,
  );
}
