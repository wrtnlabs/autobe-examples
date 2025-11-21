import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test that customers cannot create preferences for other customer accounts.
 * Customer A creates a preference, then Customer B attempts to create a
 * preference using Customer A's customer ID in the path parameter. Validate
 * that the system rejects the request with proper authorization error since
 * customers can only manage their own preferences.
 */
export async function test_api_customer_preference_creation_different_customer_scoping(
  connection: api.IConnection,
) {
  // Step 1: Create Customer A account
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: "password123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerA);

  // Step 2: Create Customer B account
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: "password456",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerB);

  // Step 3: Customer A creates a preference to establish ownership
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

  // Step 4: Switch to Customer B authentication
  // Create a fresh connection without authentication headers
  const customerBConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.customer.join(customerBConnection, {
    body: {
      email: customerBEmail,
      password: "password456",
      first_name: customerB.first_name,
      last_name: customerB.last_name,
      phone_number: customerB.phone_number,
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });

  // Step 5: Customer B successfully creates a preference for their own account
  const customerBPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      customerBConnection,
      {
        body: {
          preference_type: "display",
          preference_key: "theme",
          preference_value: "dark",
          category: "appearance",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(customerBPreference);

  // Step 6: Customer B attempts to create a preference using Customer A's customer ID
  await TestValidator.error(
    "Customer B cannot create preference for Customer A's account",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.postByCustomerid(
        customerBConnection,
        {
          customerId: customerA.id,
          body: {
            preference_type: "notification",
            preference_key: "push_notifications",
            preference_value: "enabled",
            category: "communication",
          } satisfies IShoppingMallUserPreference.ICreate,
        },
      );
    },
  );

  // Step 7: Validate that Customer B's own preference was created successfully
  TestValidator.equals(
    "Customer B's preference belongs to Customer B",
    customerBPreference.customer.id,
    customerB.id,
  );
}
