import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test preference retrieval when attempting to access another customer's
 * preference. Customer A creates a preference, then Customer B attempts to
 * retrieve Customer A's preference by ID to verify proper access control
 * enforcement. Validate that the system returns appropriate error indicating
 * authorization failure, ensuring customer data isolation and privacy
 * protection.
 */
export async function test_api_customer_user_preference_retrieval_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate Customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: "password123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerA);

  // Step 2: Customer A creates a preference
  const preferenceA =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: "notification",
          preference_key: "email_frequency",
          preference_value: "daily",
          category: "communication",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(preferenceA);

  // Step 3: Create Customer B with separate connection to maintain isolation
  const customerBConnection: api.IConnection = { ...connection, headers: {} };
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(
    customerBConnection,
    {
      body: {
        email: customerBEmail,
        password: "password456",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // Step 4: Customer B attempts to retrieve Customer A's preference (should fail)
  await TestValidator.error(
    "Customer B should not be able to access Customer A's preference",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.getByPreferenceid(
        customerBConnection,
        {
          preferenceId: preferenceA.id,
        },
      );
    },
  );

  // Step 5: Verify Customer A can still access their own preference
  const preferenceAReloaded =
    await api.functional.shoppingMall.customer.userPreferences.getByPreferenceid(
      connection,
      {
        preferenceId: preferenceA.id,
      },
    );
  typia.assert(preferenceAReloaded);
  TestValidator.equals(
    "Customer A should be able to access their own preference",
    preferenceAReloaded.id,
    preferenceA.id,
  );
}
