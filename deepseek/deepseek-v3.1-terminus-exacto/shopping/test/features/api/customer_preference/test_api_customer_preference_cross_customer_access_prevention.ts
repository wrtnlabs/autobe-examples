import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test security validation preventing customers from accessing preferences
 * belonging to other customers. Customer A creates a preference, Customer B
 * attempts to retrieve Customer A's preference using Customer A's customer ID
 * and preference ID. Validates proper ownership verification and access control
 * enforcement.
 */
export async function test_api_customer_preference_cross_customer_access_prevention(
  connection: api.IConnection,
) {
  // 1. Create Customer A account
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

  // 2. Customer A creates a preference setting
  const preferenceA =
    await api.functional.shoppingMall.customer.userPreferences.postByCustomerid(
      connection,
      {
        customerId: customerA.id,
        body: {
          preference_type: "notification",
          preference_key: "email_frequency",
          preference_value: "daily",
          category: "communication",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(preferenceA);

  // 3. Create Customer B account
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

  // 4. Customer B attempts unauthorized access to Customer A's preference
  await TestValidator.error(
    "Customer B should not be able to access Customer A's preference",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.getByCustomeridAndPreferenceid(
        connection,
        {
          customerId: customerA.id, // Using Customer A's ID
          preferenceId: preferenceA.id, // Using Customer A's preference ID
        },
      );
    },
  );

  // 5. Customer A should still be able to access their own preference
  const customerAPreference =
    await api.functional.shoppingMall.customer.userPreferences.getByCustomeridAndPreferenceid(
      connection,
      {
        customerId: customerA.id,
        preferenceId: preferenceA.id,
      },
    );
  typia.assert(customerAPreference);
  TestValidator.equals(
    "Customer A should access their own preference",
    customerAPreference.id,
    preferenceA.id,
  );

  // 6. Customer B should not be able to access Customer A's preference even with correct preference ID
  await TestValidator.error(
    "Customer B should not access Customer A's preference with correct ID",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.getByCustomeridAndPreferenceid(
        connection,
        {
          customerId: customerA.id,
          preferenceId: preferenceA.id,
        },
      );
    },
  );
}
