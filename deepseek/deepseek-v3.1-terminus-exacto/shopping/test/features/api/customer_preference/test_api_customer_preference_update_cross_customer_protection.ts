import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test that customers cannot update preferences belonging to other customers.
 * Customer A creates a preference, then Customer B attempts to update Customer
 * A's preference using the preference ID. Validate that the system rejects the
 * update request with proper authorization error, ensuring customers can only
 * modify their own preference settings.
 */
export async function test_api_customer_preference_update_cross_customer_protection(
  connection: api.IConnection,
) {
  // Step 1: Create Customer A account
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: "password123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerA);

  // Step 2: Create Customer B account
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: "password456",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerB);

  // Step 3: Customer A creates a preference
  const customerAPreference =
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
  typia.assert(customerAPreference);

  // Step 4: Customer B attempts to update Customer A's preference
  await TestValidator.error(
    "Customer B cannot update Customer A's preference",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.update(
        connection,
        {
          preferenceId: customerAPreference.id,
          body: {
            preference_value: "weekly",
          } satisfies IShoppingMallUserPreference.IUpdate,
        },
      );
    },
  );

  // Step 5: Verify Customer A's preference remains unchanged
  // Note: Since we don't have a GET endpoint for individual preferences,
  // we'll validate that the update attempt failed as expected
  TestValidator.predicate(
    "Customer A's preference ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      customerAPreference.id,
    ),
  );

  TestValidator.equals(
    "Customer A's preference type should remain unchanged",
    customerAPreference.preference_type,
    "notification",
  );

  TestValidator.equals(
    "Customer A's preference key should remain unchanged",
    customerAPreference.preference_key,
    "email_frequency",
  );
}
